import uuid
import asyncpg
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query

from api.v1 import deps
from schemas import common as common_schema
from schemas import user as user_schema

router = APIRouter()


@router.get(
    "/search",
    response_model=common_schema.SearchResult,
    summary="【共通】コンテンツのキーワード検索"
)
async def search_contents(
    conn: asyncpg.Connection = Depends(deps.get_db),
    q: str = Query(..., min_length=1, description="検索キーワード"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    クイズと豆知識のタイトルまたは本文にキーワードを含むコンテンツを検索します。
    """
    # ILIKE を使って大文字小文字を区別せずに部分一致検索
    search_term = f"%{q}%"
    
    # 検索結果の総数を取得
    total_count_record = await conn.fetchrow(
        """
        SELECT COUNT(*) FROM contents
        WHERE (title ILIKE $1 OR content ILIKE $1)
          AND is_published = TRUE
        """,
        search_term
    )
    total = total_count_record['count'] if total_count_record else 0
    
    # 検索結果を指定された件数だけ取得
    search_records = await conn.fetch(
        """
        SELECT * FROM contents
        WHERE (title ILIKE $1 OR content ILIKE $1)
          AND is_published = TRUE
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """,
        search_term, limit, offset
    )

    # クイズの場合は選択肢を、すべての場合はタグを取得
    items = []
    for record in search_records:
        options = []
        if record['content_type'] == 'quiz':
            options = await conn.fetch("SELECT * FROM quiz_options WHERE content_id = $1 ORDER BY display_order", record['id'])
        
        tags = await conn.fetch("SELECT t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", record['id'])
        
        item = {**record, "tags": tags}
        if options:
            item["options"] = options
        items.append(item)

    return {"items": items, "total": total}


@router.get(
    "/notifications",
    response_model=List[common_schema.Notification],
    summary="【共通】通知一覧を取得"
)
async def get_notifications(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    自身宛の通知一覧を取得します。（要認証）
    """
    notifications = await conn.fetch(
        """
        SELECT * FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
        """,
        current_user.id
    )
    
    # TODO: 通知を既読にする処理を追加（例: /notifications/{id}/read）
    
    return notifications
