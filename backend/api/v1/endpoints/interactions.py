import uuid
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from api.v1 import deps
from schemas import user as user_schema

router = APIRouter()

async def _check_content_exists(conn: asyncpg.Connection, content_id: uuid.UUID):
    """
    ヘルパー関数：コンテンツが存在するか確認
    """
    content = await conn.fetchval("SELECT 1 FROM contents WHERE id = $1", content_id)
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")


@router.post(
    "/{content_id}/like",
    summary="コンテンツに「いいね」する",
    status_code=status.HTTP_204_NO_CONTENT
)
async def like_content(
    content_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    指定されたコンテンツに「いいね」を追加します。
    既に「いいね」している場合は、何も起こりません。（要認証）
    """
    await _check_content_exists(conn, content_id)

    # ON CONFLICT DO NOTHING を使い、ユニーク制約違反（既にいいね済み）の場合はエラーにせず無視する
    await conn.execute(
        """
        INSERT INTO interactions (user_id, content_id, interaction_type)
        VALUES ($1, $2, 'like')
        ON CONFLICT (user_id, content_id, interaction_type) DO NOTHING
        """,
        current_user.id, content_id
    )
    return


@router.delete(
    "/{content_id}/like",
    summary="コンテンツの「いいね」を取り消す",
    status_code=status.HTTP_204_NO_CONTENT
)
async def unlike_content(
    content_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    指定されたコンテンツの「いいね」を取り消します。（要認証）
    """
    await conn.execute(
        "DELETE FROM interactions WHERE user_id = $1 AND content_id = $2 AND interaction_type = 'like'",
        current_user.id, content_id
    )
    return


@router.post(
    "/{content_id}/save",
    summary="コンテンツを保存（ブックマーク）する",
    status_code=status.HTTP_204_NO_CONTENT
)
async def save_content(
    content_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    指定されたコンテンツを保存（ブックマーク）します。（要認証）
    """
    await _check_content_exists(conn, content_id)

    await conn.execute(
        """
        INSERT INTO interactions (user_id, content_id, interaction_type)
        VALUES ($1, $2, 'save')
        ON CONFLICT (user_id, content_id, interaction_type) DO NOTHING
        """,
        current_user.id, content_id
    )
    return


@router.delete(
    "/{content_id}/save",
    summary="コンテンツの保存を取り消す",
    status_code=status.HTTP_204_NO_CONTENT
)
async def unsave_content(
    content_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    指定されたコンテンツの保存（ブックマーク）を取り消します。（要認証）
    """
    await conn.execute(
        "DELETE FROM interactions WHERE user_id = $1 AND content_id = $2 AND interaction_type = 'save'",
        current_user.id, content_id
    )
    return
