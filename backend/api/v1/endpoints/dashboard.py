import uuid
import asyncpg
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from api.v1 import deps
from schemas import dashboard as dashboard_schema
from schemas import user as user_schema
# teams.py から get_current_teacher をインポートします
from api.v1.endpoints.teams import get_current_teacher

router = APIRouter()

@router.get(
    "/summary",
    response_model=dashboard_schema.DashboardSummary,
    summary="【教師用】ダッシュボードのサマリー情報を取得"
)
async def get_dashboard_summary(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher),
    team_id: Optional[uuid.UUID] = None # オプション: 特定のチームIDで絞り込む
):
    """
    自身が管理するチーム（または指定した単一チーム）の学習状況サマリーを取得します。（教師権限が必要）
    """
    
    # 1. 対象となる生徒のIDリストを取得
    student_ids_query = """
        SELECT tm.user_id FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE t.created_by = $1
    """
    params = [current_teacher.id]
    
    if team_id:
        # 特定のチームが指定された場合、そのチームの所有者かも確認
        is_owner = await conn.fetchval(
            "SELECT 1 FROM teams WHERE id = $1 AND created_by = $2",
            team_id, current_teacher.id
        )
        if not is_owner:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found or you are not the owner")
        student_ids_query += " AND t.id = $2"
        params.append(team_id)

    student_records = await conn.fetch(student_ids_query, *params)
    student_ids = [s['user_id'] for s in student_records]
    total_students = len(student_ids)

    if not student_ids:
        # 生徒がいない場合はゼロの統計を返す
        return {
            "total_students": 0,
            "total_quizzes_answered": 0,
            "overall_accuracy": 0.0,
            "total_posts_created": 0,
            "pending_reports_count": 0
        }

    # 2. 各統計値を並行して集計
    total_answered_fut = conn.fetchval("SELECT COUNT(*) FROM user_answers WHERE user_id = ANY($1)", student_ids)
    correct_answers_fut = conn.fetchval("SELECT COUNT(*) FROM user_answers WHERE user_id = ANY($1) AND is_correct = TRUE", student_ids)
    posts_created_fut = conn.fetchval("SELECT COUNT(*) FROM contents WHERE author_id = ANY($1)", student_ids)
    pending_reports_fut = conn.fetchval("SELECT COUNT(*) FROM reports WHERE reporter_id = ANY($1) AND status = 'pending'", student_ids)

    total_quizzes_answered = await total_answered_fut or 0
    correct_answers = await correct_answers_fut or 0
    total_posts_created = await posts_created_fut or 0
    pending_reports_count = await pending_reports_fut or 0

    # 3. 正答率を計算
    overall_accuracy = 0.0
    if total_quizzes_answered > 0:
        overall_accuracy = round((correct_answers / total_quizzes_answered) * 100, 2)

    return {
        "total_students": total_students,
        "total_quizzes_answered": total_quizzes_answered,
        "overall_accuracy": overall_accuracy,
        "total_posts_created": total_posts_created,
        "pending_reports_count": pending_reports_count
    }


@router.get(
    "/popular-tags",
    response_model=List[dashboard_schema.PopularTag],
    summary="【教師用】人気のタグランキングを取得"
)
async def get_popular_tags(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher),
    team_id: Optional[uuid.UUID] = None # オプション: 特定のチームIDで絞り込む
):
    """
    自身が管理するチームの生徒が作成した投稿で、最もよく使われているタグをランキング形式で取得します。（教師権限が必要）
    """
    
    query = """
        SELECT t.id as tag_id, t.name as tag_name, COUNT(ct.tag_id) as usage_count
        FROM tags t
        JOIN content_tags ct ON t.id = ct.tag_id
        JOIN contents c ON ct.content_id = c.id
        JOIN team_members tm ON c.author_id = tm.user_id
        JOIN teams team ON tm.team_id = team.id
        WHERE team.created_by = $1
    """
    params = [current_teacher.id]

    if team_id:
        # 特定のチームが指定された場合、そのチームの所有者かも確認
        is_owner = await conn.fetchval(
            "SELECT 1 FROM teams WHERE id = $1 AND created_by = $2",
            team_id, current_teacher.id
        )
        if not is_owner:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found or you are not the owner")
        query += " AND team.id = $2"
        params.append(team_id)

    query += """
        GROUP BY t.id, t.name
        ORDER BY usage_count DESC
        LIMIT 10
    """
    
    popular_tags_records = await conn.fetch(query, *params)
    
    # ★★★ 修正 ★★★: Recordのリストをdictのリストに変換
    return [dict(tag) for tag in popular_tags_records]

