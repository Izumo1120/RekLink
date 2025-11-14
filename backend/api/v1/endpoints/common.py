import uuid
import asyncpg
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body

from api.v1 import deps
from schemas import common as common_schema
from schemas import user as user_schema
from schemas import content as content_schema

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


@router.get(
    "/public/feed",
    summary="【公開】認証不要の公開フィード取得"
)
async def get_public_feed(
    conn: asyncpg.Connection = Depends(deps.get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    認証不要で公開されている全てのクイズと豆知識を取得します。
    作成者情報は匿名化されます。
    """
    # 公開コンテンツを取得
    contents = await conn.fetch(
        """
        SELECT
            c.id, c.title, c.content, c.content_type,
            c.created_at, c.updated_at, c.is_published,
            NULL::uuid as author_id  -- 匿名化のためNULLに
        FROM contents c
        WHERE c.is_published = TRUE
        ORDER BY c.created_at DESC
        LIMIT $1 OFFSET $2
        """,
        limit, offset
    )

    result = []
    for content_record in contents:
        content_dict = dict(content_record)

        # タグを取得
        tags = await conn.fetch(
            """
            SELECT t.name FROM tags t
            JOIN content_tags ct ON t.id = ct.tag_id
            WHERE ct.content_id = $1
            """,
            content_record['id']
        )
        content_dict['tags'] = [tag['name'] for tag in tags]

        # クイズの場合は選択肢を取得（正解情報は含まない）
        if content_record['content_type'] == 'quiz':
            options = await conn.fetch(
                """
                SELECT id, option_text as text, display_order
                FROM quiz_options
                WHERE content_id = $1
                ORDER BY display_order
                """,
                content_record['id']
            )
            content_dict['options'] = [dict(opt) for opt in options]

        result.append(content_dict)

    return result


@router.post(
    "/public/quiz/{content_id}/answer",
    response_model=content_schema.AnswerResponse,
    summary="【公開】認証不要のクイズ解答"
)
async def submit_public_quiz_answer(
    content_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    selected_option_id: uuid.UUID = Body(..., embed=True),
):
    """
    認証不要でクイズに解答します。
    解答履歴は保存されません。
    """
    # クイズが存在するか確認
    content = await conn.fetchrow(
        """
        SELECT id, content_type, is_published
        FROM contents
        WHERE id = $1
        """,
        content_id
    )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="クイズが見つかりません。"
        )

    if content['content_type'] != 'quiz':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このコンテンツはクイズではありません。"
        )

    if not content['is_published']:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="このクイズは公開されていません。"
        )

    # 選択された選択肢が存在するか確認
    selected_option = await conn.fetchrow(
        """
        SELECT id, is_correct
        FROM quiz_options
        WHERE id = $1 AND content_id = $2
        """,
        selected_option_id, content_id
    )

    if not selected_option:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="選択された選択肢が見つかりません。"
        )

    # 正解の選択肢を取得
    correct_option = await conn.fetchrow(
        """
        SELECT id FROM quiz_options
        WHERE content_id = $1 AND is_correct = TRUE
        """,
        content_id
    )

    if not correct_option:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="クイズに正解が設定されていません。"
        )

    # 解説をcontentsテーブルから取得
    explanation_record = await conn.fetchrow(
        """
        SELECT explanation FROM contents
        WHERE id = $1
        """,
        content_id
    )

    # 解答結果を返す（保存はしない）
    return {
        "is_correct": selected_option['is_correct'],
        "correct_option_id": correct_option['id'],
        "explanation": explanation_record['explanation'] if explanation_record else None
    }
