import uuid
import asyncpg
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from api.v1 import deps
from schemas import user as user_schema
from schemas import content as content_schema
# teams.py から get_current_teacher をインポートします
# (将来的には deps.py に移すのが望ましいです)
from api.v1.endpoints.teams import get_current_teacher

router = APIRouter()


@router.get(
    "/{student_id}",
    response_model=user_schema.StudentDetails,
    summary="【教師用】特定の生徒の詳細情報を取得"
)
async def get_student_details(
    student_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    自身が管理するチームに所属する、特定の生徒の詳細な学習情報を取得します。（教師権限が必要）

    取得できる情報:
    - 生徒のプロフィール
    - 学習統計（解答数、正答率、投稿数）
    - 最近の投稿履歴
    - 最近の解答履歴
    """

    # 1. 生徒が存在し、かつ教師の管理するチームに所属しているか検証
    student_profile_record = await conn.fetchrow(
        """
        SELECT u.* FROM users u
        JOIN team_members tm ON u.id = tm.user_id
        JOIN teams t ON tm.team_id = t.id
        WHERE u.id = $1 AND u.role = 'student' AND t.created_by = $2
        """,
        student_id, current_teacher.id
    )

    if not student_profile_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found or you do not have permission to view this student"
        )

    # 2. 学習統計を取得 (users.py の /me/statistics と同様のロジック)
    total_answered_fut = conn.fetchval("SELECT COUNT(*) FROM user_answers WHERE user_id = $1", student_id)
    correct_answers_fut = conn.fetchval("SELECT COUNT(*) FROM user_answers WHERE user_id = $1 AND is_correct = TRUE", student_id)
    posts_created_fut = conn.fetchval("SELECT COUNT(*) FROM contents WHERE author_id = $1", student_id)

    total_answered = await total_answered_fut or 0
    correct_answers = await correct_answers_fut or 0
    posts_created = await posts_created_fut or 0

    accuracy = 0.0
    if total_answered > 0:
        accuracy = round((correct_answers / total_answered) * 100, 2)

    stats = {
        "total_quizzes_answered": total_answered,
        "correct_answers": correct_answers,
        "accuracy": accuracy,
        "posts_created": posts_created,
    }

    # 3. 投稿履歴を取得 (直近10件)
    post_records = await conn.fetch(
        "SELECT id, content_type, title, created_at FROM contents WHERE author_id = $1 ORDER BY created_at DESC LIMIT 10",
        student_id
    )

    # 4. 解答履歴を取得 (直近10件)
    answer_records = await conn.fetch(
        """
        SELECT ua.id, ua.content_id, c.title as quiz_title, ua.selected_option_id, ua.is_correct, ua.answered_at
        FROM user_answers ua
        JOIN contents c ON ua.content_id = c.id
        WHERE ua.user_id = $1
        ORDER BY ua.answered_at DESC LIMIT 10
        """,
        student_id
    )

    # 5. すべての情報を結合して返す
    # ★★★ 修正 ★★★: すべてのRecordとRecordリストをdictに変換
    return {
        "profile": dict(student_profile_record),
        "stats": stats,
        "recent_posts": [dict(p) for p in post_records],
        "recent_answers": [dict(a) for a in answer_records]
    }

