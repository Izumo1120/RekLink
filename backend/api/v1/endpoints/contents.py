import uuid
from typing import List

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.v1 import deps
from schemas import content as content_schema
from schemas import user as user_schema

router = APIRouter()


# --- ヘルパー関数 ---

async def _get_quiz_details(conn: asyncpg.Connection, quiz_id: uuid.UUID) -> dict:
    """
    指定されたIDのクイズと、それに関連するオプションとタグを取得する
    """
    quiz_record = await conn.fetchrow(
        "SELECT * FROM contents WHERE id = $1 AND content_type = 'quiz'", quiz_id
    )
    if not quiz_record:
        raise HTTPException(status_code=404, detail="Quiz not found")

    options = await conn.fetch("SELECT * FROM quiz_options WHERE content_id = $1 ORDER BY display_order", quiz_id)
    tags = await conn.fetch("SELECT t.id, t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", quiz_id)

    # Recordをdictに変換して返す
    return {
        **dict(quiz_record),
        "options": [dict(o) for o in options],
        "tags": [dict(t) for t in tags]
    }

async def _check_quiz_author(
    conn: asyncpg.Connection,
    quiz_id: uuid.UUID,
    user_id: uuid.UUID
):
    """
    ユーザーがクイズの作成者（author）であるか確認する
    """
    author_id = await conn.fetchval(
        "SELECT author_id FROM contents WHERE id = $1 AND content_type = 'quiz'",
        quiz_id
    )
    if not author_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    if author_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this quiz"
        )


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
        "SELECT * FROM contents "
        "WHERE content_type = 'quiz' AND is_published = TRUE "
        "ORDER BY created_at DESC "
        "LIMIT $1 OFFSET $2",
        limit, offset
    )

    quizzes = []
    for record in quiz_records:
        options = await conn.fetch("SELECT * FROM quiz_options WHERE content_id = $1 ORDER BY display_order", record['id'])
        tags = await conn.fetch("SELECT t.id, t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", record['id'])
        quizzes.append({**dict(record), "options": [dict(o) for o in options], "tags": [dict(t) for t in tags]})

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
            "INSERT INTO contents (content_type, title, content, explanation, author_id) "
            "VALUES ('quiz', $1, $2, $3, $4) RETURNING *",
            quiz_in.title, quiz_in.content, quiz_in.explanation, current_user.id
        )

        options_list = []
        for i, option in enumerate(quiz_in.options):
            option_record = await conn.fetchrow(
                "INSERT INTO quiz_options (content_id, option_text, is_correct, display_order) "
                "VALUES ($1, $2, $3, $4) RETURNING *",
                new_quiz_record['id'], option.option_text, option.is_correct, i
            )
            options_list.append(dict(option_record))
        
        tags_list = []
        if quiz_in.tags:
            for tag_name in quiz_in.tags:
                tag_record = await conn.fetchrow("SELECT id, name FROM tags WHERE name = $1", tag_name)
                if not tag_record:
                    tag_record = await conn.fetchrow("INSERT INTO tags (name) VALUES ($1) RETURNING id, name", tag_name)
                await conn.execute("INSERT INTO content_tags (content_id, tag_id) VALUES ($1, $2)", new_quiz_record['id'], tag_record['id'])
                tags_list.append(dict(tag_record))

    return {**dict(new_quiz_record), "options": options_list, "tags": tags_list}


@router.get("/quizzes/{quiz_id}", response_model=content_schema.Quiz)
async def read_quiz(quiz_id: uuid.UUID, conn: asyncpg.Connection = Depends(deps.get_db)):
    """
    指定されたIDのクイズを一件取得します。
    """
    return await _get_quiz_details(conn, quiz_id)


@router.put("/quizzes/{quiz_id}", response_model=content_schema.Quiz)
async def update_quiz(
    quiz_id: uuid.UUID,
    quiz_in: content_schema.QuizUpdate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    既存のクイズを更新します。（要認証・作成者のみ）
    """
    # 1. ユーザーがクイズの作成者であることを確認
    await _check_quiz_author(conn, quiz_id, current_user.id)
    
    # 2. データベースのトランザクションを開始
    async with conn.transaction():
        # 3. contentsテーブル本体を更新 (部分更新)
        update_data = quiz_in.model_dump(exclude_unset=True)
        # optionsとtagsは別で処理するので除外
        options = update_data.pop('options', None)
        tags = update_data.pop('tags', None)

        if update_data: # 更新するフィールドが何かあれば
            set_clause = ", ".join([f"{key} = ${i+1}" for i, key in enumerate(update_data.keys())])
            values = list(update_data.values())
            values.append(quiz_id)
            
            await conn.execute(
                f"UPDATE contents SET {set_clause}, updated_at = NOW() WHERE id = ${len(values)}",
                *values
            )

        # 4. 選択肢を更新 (指定があった場合のみ)
        if options is not None:
            # 既存の選択肢をすべて削除
            await conn.execute("DELETE FROM quiz_options WHERE content_id = $1", quiz_id)
            # 新しい選択肢を挿入
            for i, option in enumerate(options):
                await conn.execute(
                    "INSERT INTO quiz_options (content_id, option_text, is_correct, display_order) "
                    "VALUES ($1, $2, $3, $4)",
                    quiz_id, option.option_text, option.is_correct, i
                )

        # 5. タグを更新 (指定があった場合のみ)
        if tags is not None:
            # 既存のタグ関連をすべて削除
            await conn.execute("DELETE FROM content_tags WHERE content_id = $1", quiz_id)
            # 新しいタグ関連を挿入
            for tag_name in tags:
                tag_record = await conn.fetchrow("SELECT id FROM tags WHERE name = $1", tag_name)
                if not tag_record:
                    tag_record = await conn.fetchrow("INSERT INTO tags (name) VALUES ($1) RETURNING id", tag_name)
                await conn.execute("INSERT INTO content_tags (content_id, tag_id) VALUES ($1, $2)", quiz_id, tag_record['id'])

    # 6. 更新後の完全なクイズデータを取得して返す
    return await _get_quiz_details(conn, quiz_id)


@router.delete("/quizzes/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    クイズを削除します。（要認証・作成者のみ）
    """
    # 1. ユーザーがクイズの作成者であることを確認
    await _check_quiz_author(conn, quiz_id, current_user.id)
    
    # 2. 削除を実行 (ON DELETE CASCADEにより関連データも削除される)
    await conn.execute("DELETE FROM contents WHERE id = $1", quiz_id)
    
    return


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
        "SELECT qo.id, c.explanation FROM quiz_options qo "
        "JOIN contents c ON qo.content_id = c.id "
        "WHERE qo.content_id = $1 AND qo.is_correct = TRUE",
        quiz_id
    )
    if not correct_option_record:
        raise HTTPException(status_code=404, detail="Quiz or correct option not found")

    is_correct = (answer_in.selected_option_id == correct_option_record['id'])

    await conn.execute(
        "INSERT INTO user_answers (user_id, content_id, selected_option_id, is_correct) "
        "VALUES ($1, $2, $3, $4)",
        current_user.id, quiz_id, answer_in.selected_option_id, is_correct
    )

    return {
        "is_correct": is_correct,
        "correct_option_id": correct_option_record['id'],
        "explanation": correct_option_record['explanation']
    }


@router.get("/quizzes/{quiz_id}/answers/me", response_model=List[content_schema.UserAnswer])
async def read_my_answers_for_quiz(
    quiz_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    指定されたクイズに対する自身の解答履歴を取得します。（要認証）
    """
    answer_records = await conn.fetch(
        "SELECT ua.id, ua.content_id, c.title as quiz_title, ua.selected_option_id, ua.is_correct, ua.answered_at "
        "FROM user_answers ua JOIN contents c ON ua.content_id = c.id "
        "WHERE ua.user_id = $1 AND ua.content_id = $2 "
        "ORDER BY ua.answered_at DESC",
        current_user.id, quiz_id
    )
    return [dict(r) for r in answer_records]

@router.get("/quizzes/answers/me", response_model=List[content_schema.UserAnswer])
async def read_my_all_quiz_answers(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    自身の全クイズ解答履歴を取得します。（要認証）
    (GET /users/me/answers と機能的に重複しますが、/quizzes 配下にも配置します)
    """
    answer_records = await conn.fetch(
        "SELECT ua.id, ua.content_id, c.title as quiz_title, ua.selected_option_id, ua.is_correct, ua.answered_at "
        "FROM user_answers ua JOIN contents c ON ua.content_id = c.id "
        "WHERE ua.user_id = $1 AND c.content_type = 'quiz' " # クイズの解答のみに絞り込む
        "ORDER BY ua.answered_at DESC",
        current_user.id
    )
    return [dict(r) for r in answer_records]



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
        "SELECT * FROM contents "
        "WHERE content_type = 'trivia' AND is_published = TRUE "
        "ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        limit, offset
    )
    
    facts = []
    for record in fact_records:
        tags = await conn.fetch("SELECT t.id, t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", record['id'])
        facts.append({**dict(record), "tags": [dict(t) for t in tags]})

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
            "INSERT INTO contents (content_type, title, content, explanation, author_id) "
            "VALUES ('trivia', $1, $2, $3, $4) RETURNING *",
            fact_in.title, fact_in.content, fact_in.explanation, current_user.id
        )
        
        tags_list = []
        if fact_in.tags:
            for tag_name in fact_in.tags:
                tag_record = await conn.fetchrow("SELECT id, name FROM tags WHERE name = $1", tag_name)
                if not tag_record:
                    tag_record = await conn.fetchrow("INSERT INTO tags (name) VALUES ($1) RETURNING id, name", tag_name)
                await conn.execute("INSERT INTO content_tags (content_id, tag_id) VALUES ($1, $2)", new_fact_record['id'], tag_record['id'])
                tags_list.append(dict(tag_record))

    return {**dict(new_fact_record), "tags": tags_list}


@router.get("/facts/{fact_id}", response_model=content_schema.Trivia)
async def read_fact(fact_id: uuid.UUID, conn: asyncpg.Connection = Depends(deps.get_db)):
    """
    指定されたIDの豆知識を一件取得します。
    """
    fact_record = await conn.fetchrow("SELECT * FROM contents WHERE id = $1 AND content_type = 'trivia'", fact_id)
    if not fact_record:
        raise HTTPException(status_code=404, detail="Fact not found")

    tags = await conn.fetch("SELECT t.id, t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", fact_id)
    
    return {**dict(fact_record), "tags": [dict(t) for t in tags]}


@router.put("/facts/{fact_id}", response_model=content_schema.Trivia)
async def update_fact(
    fact_id: uuid.UUID,
    fact_in: content_schema.TriviaUpdate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    既存の豆知識を更新します。（要認証・作成者のみ）
    """
    # 1. ユーザーが豆知識の作成者であることを確認
    author_id = await conn.fetchval(
        "SELECT author_id FROM contents WHERE id = $1 AND content_type = 'trivia'",
        fact_id
    )
    if not author_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fact not found")
    if author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this fact"
        )
    
    # 2. トランザクション内で更新
    async with conn.transaction():
        # 3. contentsテーブル本体を更新 (部分更新)
        update_data = fact_in.model_dump(exclude_unset=True)
        tags = update_data.pop('tags', None)

        if update_data:
            set_clause = ", ".join([f"{key} = ${i+1}" for i, key in enumerate(update_data.keys())])
            values = list(update_data.values())
            values.append(fact_id)
            
            await conn.execute(
                f"UPDATE contents SET {set_clause}, updated_at = NOW() WHERE id = ${len(values)}",
                *values
            )

        # 4. タグを更新 (指定があった場合のみ)
        if tags is not None:
            await conn.execute("DELETE FROM content_tags WHERE content_id = $1", fact_id)
            for tag_name in tags:
                tag_record = await conn.fetchrow("SELECT id FROM tags WHERE name = $1", tag_name)
                if not tag_record:
                    tag_record = await conn.fetchrow("INSERT INTO tags (name) VALUES ($1) RETURNING id", tag_name)
                await conn.execute("INSERT INTO content_tags (content_id, tag_id) VALUES ($1, $2)", fact_id, tag_record['id'])

    # 5. 更新後の豆知識データを取得して返す
    fact_record = await conn.fetchrow("SELECT * FROM contents WHERE id = $1", fact_id)
    tags_records = await conn.fetch("SELECT t.id, t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", fact_id)
    return {**dict(fact_record), "tags": [dict(t) for t in tags_records]}


@router.delete("/facts/{fact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fact(
    fact_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    豆知識を削除します。（要認証・作成者のみ）
    """
    # 1. ユーザーが豆知識の作成者であることを確認
    author_id = await conn.fetchval(
        "SELECT author_id FROM contents WHERE id = $1 AND content_type = 'trivia'",
        fact_id
    )
    if not author_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fact not found")
    if author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this fact"
        )
    
    # 2. 削除を実行
    await conn.execute("DELETE FROM contents WHERE id = $1", fact_id)
    
    return


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
            options = [dict(o) for o in options]
        
        tags = await conn.fetch("SELECT t.id, t.name FROM tags t JOIN content_tags ct ON t.id = ct.tag_id WHERE ct.content_id = $1", record['id'])
        tags = [dict(t) for t in tags]
        
        item = {**dict(record), "tags": tags}
        if options:
            item["options"] = options
        feed.append(item)

    return feed

