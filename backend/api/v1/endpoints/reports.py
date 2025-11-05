import uuid
from typing import List
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from api.v1 import deps
from schemas import report as report_schema
from schemas import user as user_schema
# teams.py から get_current_teacher をインポートします
from api.v1.endpoints.teams import get_current_teacher

router = APIRouter()

# ---------------------------------------------------------------------------
# 生徒向け API (既存)
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=report_schema.Report,
    status_code=status.HTTP_201_CREATED,
    summary="【生徒用】コンテンツへの指摘を投稿する"
)
async def create_report(
    report_in: report_schema.ReportCreate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    コンテンツに対する誤りの指摘や改善提案を投稿します。（要認証）
    """
    content_exists = await conn.fetchval("SELECT 1 FROM contents WHERE id = $1", report_in.content_id)
    if not content_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content to report not found"
        )

    new_report_record = await conn.fetchrow(
        """
        INSERT INTO reports (reporter_id, content_id, category, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        current_user.id,
        report_in.content_id,
        report_in.category,
        report_in.description
    )

    # TODO: 教師への通知処理を非同期タスクとして実行する

    return dict(new_report_record)


@router.get(
    "/me",
    response_model=List[report_schema.Report],
    summary="【生徒用】自身の指摘履歴を取得する"
)
async def read_my_reports(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    自身が過去に投稿した指摘の一覧を取得します。（要認証）
    """
    my_reports_records = await conn.fetch(
        "SELECT * FROM reports WHERE reporter_id = $1 ORDER BY created_at DESC",
        current_user.id
    )
    
    return [dict(r) for r in my_reports_records]


# ---------------------------------------------------------------------------
# 教師向け API (新規追加)
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=List[report_schema.ReportDetails],
    summary="【教師用】指摘・フィードバック一覧を取得"
)
async def get_reports(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher),
    # TODO: statusやteam_idでの絞り込み機能
):
    """
    自身が管理するチームの生徒から投稿された、未対応の指摘・フィードバック一覧を取得します。（教師権限が必要）
    """
    team_ids = await conn.fetchval(
        "SELECT array_agg(id) FROM teams WHERE created_by = $1", current_teacher.id
    )
    if not team_ids:
        return []

    report_records = await conn.fetch(
        """
        SELECT
            r.*,
            u.nickname AS reporter_nickname,
            c.title AS content_title
        FROM reports r
        JOIN users u ON r.reporter_id = u.id
        JOIN contents c ON r.content_id = c.id
        JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = ANY($1) AND r.status = 'pending'
        ORDER BY r.created_at ASC
        """,
        team_ids
    )
    
    return [dict(r) for r in report_records]


@router.put(
    "/{report_id}/resolve",
    response_model=report_schema.ReportDetails,
    summary="【教師用】指摘のステータスを更新（対応完了など）"
)
async def resolve_report(
    report_id: uuid.UUID,
    report_update: report_schema.ReportStatusUpdate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    指摘の対応状況（例: 'resolved'）を更新します。（教師権限が必要）
    ※教師は自身が管理するチームの生徒からの指摘のみ更新可能
    """
    
    # ★★★ 修正 ★★★: $1 を $1::VARCHAR にキャストして型を明示
    target_report_record = await conn.fetchrow(
        """
        UPDATE reports r
        SET
            status = $1::VARCHAR,
            resolution_note = $2,
            resolved_by = $3,
            resolved_at = CASE WHEN $1::VARCHAR = 'resolved' OR $1::VARCHAR = 'rejected' THEN NOW() ELSE NULL END
        FROM users u, team_members tm, teams t
        WHERE r.id = $4
          AND r.reporter_id = u.id
          AND u.id = tm.user_id
          AND tm.team_id = t.id
          AND t.created_by = $3
        RETURNING r.*, u.nickname as reporter_nickname, (SELECT title FROM contents c WHERE c.id = r.content_id) as content_title
        """,
        report_update.status,
        report_update.resolution_note,
        current_teacher.id,
        report_id
    )

    if not target_report_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or you do not have permission to update it"
        )
    
    return dict(target_report_record)


@router.get(
    "/{report_id}/content",
    response_model=report_schema.ContentForReport,
    summary="【教師用】指摘対象のコンテンツ内容を取得"
)
async def get_content_for_report(
    report_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    指摘対象となったコンテンツの詳細内容を取得します。（教師権限が必要）
    ※コンテンツ修正UIでの表示用
    """
    content_record = await conn.fetchrow(
        """
        SELECT c.id, c.content_type, c.title, c.content, c.explanation
        FROM contents c
        JOIN reports r ON c.id = r.content_id
        JOIN users u ON r.reporter_id = u.id
        JOIN team_members tm ON u.id = tm.user_id
        JOIN teams t ON tm.team_id = t.id
        WHERE r.id = $1 AND t.created_by = $2
        """,
        report_id, current_teacher.id
    )

    if not content_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found or you do not have permission to view it"
        )
    
    return dict(content_record)


@router.delete(
    "/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="【教師用】指摘を削除"
)
async def delete_report(
    report_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    指摘を削除します。（教師権限が必要）
    ※教師は自身が管理するチームの生徒からの指摘のみ削除可能
    """
    result = await conn.execute(
        """
        DELETE FROM reports r
        USING users u, team_members tm, teams t
        WHERE r.id = $1
          AND r.reporter_id = u.id
          AND u.id = tm.user_id
          AND tm.team_id = t.id
          AND t.created_by = $2
        """,
        report_id, current_teacher.id
    )
    
    if result == 'DELETE 0':
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or you do not have permission to delete it"
        )
    
    return

