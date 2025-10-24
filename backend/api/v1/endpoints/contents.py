import uuid
from typing import List

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.v1 import deps
from schemas import content as content_schema
from schemas import user as user_schema

router = APIRouter()

# ---------------------------------------------------------------------------
# クイズ (Quiz) 関連 API
# ---------------------------------------------------------------------------

@router.get("/quizzes", response_model=List[content_schema.Quiz])
async def read_quizzes(
    conn: asyncpg.Connection = Depends(deps.get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    クイズの一覧を取得します。
    """
    quiz_records = await conn.fetch(
        """
        SELECT * FROM contents
        WHERE content_type = 'quiz' AND is_published = TRUE
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        """,
        limit, offset
    )

    quizzes = []
    for record in quiz_records:
        options = await conn.fetch("SELECT * FROM quiz_options WHERE content_id = $1 ORDER BY display_order", record['id'])
        tags = await conn.fetch("SELECT t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", record['id'])
        quizzes.append({**record, "options": options, "tags": tags})

    return quizzes


@router.post("/quizzes", response_model=content_schema.Quiz, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz_in: content_schema.QuizCreate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    新しいクイズを作成します。（要認証）
    """
    async with conn.transaction():
        new_quiz_record = await conn.fetchrow(
            """
            INSERT INTO contents (content_type, title, content, explanation, author_id)
            VALUES ('quiz', $1, $2, $3, $4) RETURNING *
            """,
            quiz_in.title, quiz_in.content, quiz_in.explanation, current_user.id
        )

        options_list = []
        for i, option in enumerate(quiz_in.options):
            option_record = await conn.fetchrow(
                "INSERT INTO quiz_options (content_id, option_text, is_correct, display_order) VALUES ($1, $2, $3, $4) RETURNING *",
                new_quiz_record['id'], option.option_text, option.is_correct, i
            )
            options_list.append(option_record)
        
        # TODO: タグの処理を共通関数化する
        tags_list = []
        if quiz_in.tags:
            for tag_name in quiz_in.tags:
                tag_record = await conn.fetchrow("SELECT id FROM tags WHERE name = $1", tag_name)
                if not tag_record:
                    tag_record = await conn.fetchrow("INSERT INTO tags (name) VALUES ($1) RETURNING id, name", tag_name)
                await conn.execute("INSERT INTO content_tags (content_id, tag_id) VALUES ($1, $2)", new_quiz_record['id'], tag_record['id'])
                tags_list.append(tag_record)

    return {**new_quiz_record, "options": options_list, "tags": tags_list}


@router.get("/quizzes/{quiz_id}", response_model=content_schema.Quiz)
async def read_quiz(quiz_id: uuid.UUID, conn: asyncpg.Connection = Depends(deps.get_db)):
    quiz_record = await conn.fetchrow("SELECT * FROM contents WHERE id = $1 AND content_type = 'quiz'", quiz_id)
    if not quiz_record:
        raise HTTPException(status_code=404, detail="Quiz not found")

    options = await conn.fetch("SELECT * FROM quiz_options WHERE content_id = $1 ORDER BY display_order", quiz_id)
    tags = await conn.fetch("SELECT t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", quiz_id)

    return {**quiz_record, "options": options, "tags": tags}


@router.post("/quizzes/{quiz_id}/answer", response_model=content_schema.AnswerResponse)
async def answer_quiz(
    quiz_id: uuid.UUID,
    answer_in: content_schema.AnswerCreate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    クイズに解答し、正誤判定を受け取ります。（要認証）
    """
    correct_option_record = await conn.fetchrow(
        "SELECT qo.id, c.explanation FROM quiz_options qo JOIN contents c ON qo.content_id = c.id WHERE qo.content_id = $1 AND qo.is_correct = TRUE",
        quiz_id
    )
    if not correct_option_record:
        raise HTTPException(status_code=404, detail="Quiz or correct option not found")

    is_correct = (answer_in.selected_option_id == correct_option_record['id'])

    await conn.execute(
        "INSERT INTO user_answers (user_id, content_id, selected_option_id, is_correct) VALUES ($1, $2, $3, $4)",
        current_user.id, quiz_id, answer_in.selected_option_id, is_correct
    )

    return {
        "is_correct": is_correct,
        "correct_option_id": correct_option_record['id'],
        "explanation": correct_option_record['explanation']
    }


@router.get("/quizzes/answers/me", response_model=List[content_schema.UserAnswer])
async def read_my_answers_for_quiz(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    自身の全クイズ解答履歴を取得します。（要認証）
    """
    answer_records = await conn.fetch(
        """
        SELECT ua.id, ua.content_id, c.title as quiz_title, ua.selected_option_id, ua.is_correct, ua.answered_at
        FROM user_answers ua JOIN contents c ON ua.content_id = c.id
        WHERE ua.user_id = $1 ORDER BY ua.answered_at DESC
        """,
        current_user.id
    )
    return answer_records


# ---------------------------------------------------------------------------
# 豆知識 (Trivia/Facts) 関連 API
# ---------------------------------------------------------------------------

@router.get("/facts", response_model=List[content_schema.Trivia])
async def read_facts(
    conn: asyncpg.Connection = Depends(deps.get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    豆知識の一覧を取得します。
    """
    fact_records = await conn.fetch(
        "SELECT * FROM contents WHERE content_type = 'trivia' AND is_published = TRUE ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        limit, offset
    )
    
    facts = []
    for record in fact_records:
        tags = await conn.fetch("SELECT t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", record['id'])
        facts.append({**record, "tags": tags})

    return facts


@router.post("/facts", response_model=content_schema.Trivia, status_code=status.HTTP_201_CREATED)
async def create_fact(
    fact_in: content_schema.TriviaCreate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    新しい豆知識を作成します。（要認証）
    """
    async with conn.transaction():
        new_fact_record = await conn.fetchrow(
            "INSERT INTO contents (content_type, title, content, explanation, author_id) VALUES ('trivia', $1, $2, $3, $4) RETURNING *",
            fact_in.title, fact_in.content, fact_in.explanation, current_user.id
        )
        
        tags_list = []
        if fact_in.tags:
            for tag_name in fact_in.tags:
                tag_record = await conn.fetchrow("SELECT id, name FROM tags WHERE name = $1", tag_name)
                if not tag_record:
                    tag_record = await conn.fetchrow("INSERT INTO tags (name) VALUES ($1) RETURNING id, name", tag_name)
                await conn.execute("INSERT INTO content_tags (content_id, tag_id) VALUES ($1, $2)", new_fact_record['id'], tag_record['id'])
                tags_list.append(tag_record)

    return {**new_fact_record, "tags": tags_list}


@router.get("/facts/{fact_id}", response_model=content_schema.Trivia)
async def read_fact(fact_id: uuid.UUID, conn: asyncpg.Connection = Depends(deps.get_db)):
    fact_record = await conn.fetchrow("SELECT * FROM contents WHERE id = $1 AND content_type = 'trivia'", fact_id)
    if not fact_record:
        raise HTTPException(status_code=404, detail="Fact not found")

    tags = await conn.fetch("SELECT t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", fact_id)
    return {**fact_record, "tags": tags}


# ---------------------------------------------------------------------------
# フィード (Feed) API
# ---------------------------------------------------------------------------

@router.get("/feed", response_model=List[content_schema.Quiz | content_schema.Trivia])
async def get_feed(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    おすすめのフィードを取得します。（要認証）
    NOTE: 現在は単純に新しい順で返しますが、将来的にはservices/feed_service.pyでスコアリングロジックを実装します。
    """
    feed_records = await conn.fetch(
        "SELECT * FROM contents WHERE is_published = TRUE ORDER BY created_at DESC LIMIT 50"
    )
    
    feed = []
    for record in feed_records:
        options = []
        if record['content_type'] == 'quiz':
            options = await conn.fetch("SELECT * FROM quiz_options WHERE content_id = $1 ORDER BY display_order", record['id'])
        
        tags = await conn.fetch("SELECT t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", record['id'])
        
        item = {**record, "tags": tags}
        if options:
            item["options"] = options
        feed.append(item)

    return feed

