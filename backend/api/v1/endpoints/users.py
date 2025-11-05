from typing import List
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from api.v1 import deps
from schemas import user as user_schema
from schemas import content as content_schema

router = APIRouter()


@router.get("/me/posts", response_model=List[content_schema.ContentInfo], summary="自身の投稿履歴を取得する")
async def read_my_posts(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    自身が作成したコンテンツ（クイズと豆知識）の一覧を取得します。（要認証）
    """
    posts_records = await conn.fetch(
        "SELECT id, content_type, title, created_at FROM contents WHERE author_id = $1 ORDER BY created_at DESC",
        current_user.id
    )
    
    # ★★★ 修正 ★★★: Recordのリストをdictのリストに変換
    return [dict(p) for p in posts_records]


@router.get("/me/answers", response_model=List[content_schema.UserAnswer], summary="自身の解答履歴を取得する")
async def read_my_answers(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    自身のすべてのクイズ解答履歴を取得します。（要認証）
    """
    answer_records = await conn.fetch(
        """
        SELECT ua.id, ua.content_id, c.title as quiz_title, ua.selected_option_id, ua.is_correct, ua.answered_at
        FROM user_answers ua
        JOIN contents c ON ua.content_id = c.id
        WHERE ua.user_id = $1
        ORDER BY ua.answered_at DESC
        """,
        current_user.id
    )
    
    # ★★★ 修正 ★★★: Recordのリストをdictのリストに変換
    return [dict(r) for r in answer_records]


@router.get("/me/likes", response_model=List[content_schema.ContentInfo], summary="「いいね」したコンテンツ一覧を取得する")
async def read_my_liked_contents(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    自身が「いいね」したコンテンツの一覧を取得します。（要認証）
    """
    liked_records = await conn.fetch(
        """
        SELECT c.id, c.content_type, c.title, c.created_at FROM contents c
        JOIN interactions i ON c.id = i.content_id
        WHERE i.user_id = $1 AND i.interaction_type = 'like'
        ORDER BY i.created_at DESC
        """,
        current_user.id
    )
    
    # ★★★ 修正 ★★★: Recordのリストをdictのリストに変換
    return [dict(c) for c in liked_records]


@router.get("/me/bookmarks", response_model=List[content_schema.ContentInfo], summary="保存したコンテンツ一覧を取得する")
async def read_my_saved_contents(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    自身が保存（ブックマーク）したコンテンツの一覧を取得します。（要認証）
    """
    saved_records = await conn.fetch(
        """
        SELECT c.id, c.content_type, c.title, c.created_at FROM contents c
        JOIN interactions i ON c.id = i.content_id
        WHERE i.user_id = $1 AND i.interaction_type = 'save'
        ORDER BY i.created_at DESC
        """,
        current_user.id
    )
    
    # ★★★ 修正 ★★★: Recordのリストをdictのリストに変換
    return [dict(c) for c in saved_records]


@router.get("/me/statistics", response_model=user_schema.UserStats, summary="自身の学習統計を取得する")
async def read_my_stats(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    自身の学習に関する統計情報（解答数、正答率など）を取得します。（要認証）
    """
    # 各統計値を並行して取得
    total_answered_fut = conn.fetchval("SELECT COUNT(*) FROM user_answers WHERE user_id = $1", current_user.id)
    correct_answers_fut = conn.fetchval("SELECT COUNT(*) FROM user_answers WHERE user_id = $1 AND is_correct = TRUE", current_user.id)
    posts_created_fut = conn.fetchval("SELECT COUNT(*) FROM contents WHERE author_id = $1", current_user.id)

    total_answered = await total_answered_fut
    correct_answers = await correct_answers_fut
    posts_created = await posts_created_fut

    # 正答率を計算（ゼロ除算を回避）
    accuracy = 0.0
    if total_answered > 0:
        accuracy = round((correct_answers / total_answered) * 100, 2)

    return {
        "total_quizzes_answered": total_answered,
        "correct_answers": correct_answers,
        "accuracy": accuracy,
        "posts_created": posts_created,
    }

