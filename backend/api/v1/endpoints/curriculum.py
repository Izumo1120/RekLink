import uuid
import asyncpg
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from api.v1 import deps
from schemas import curriculum as curriculum_schema
from schemas import user as user_schema
# teams.py から get_current_teacher と _verify_team_owner をインポートします
from api.v1.endpoints.teams import get_current_teacher, _verify_team_owner

router = APIRouter()


async def _get_study_setting_details(conn: asyncpg.Connection, setting_id: uuid.UUID) -> dict:
    """
    ヘルパー関数：単一のStudySettingとその関連タグを取得する
    """
    setting_record = await conn.fetchrow(
        "SELECT * FROM study_settings WHERE id = $1", setting_id
    )
    if not setting_record:
        return None

    tags = await conn.fetch(
        """
        SELECT t.id, t.name FROM tags t
        JOIN study_setting_tags sst ON t.id = sst.tag_id
        WHERE sst.study_setting_id = $1
        """,
        setting_id
    )
    return {**setting_record, "tags": tags}


@router.get(
    "/",
    response_model=List[curriculum_schema.StudySetting],
    summary="【教師用】教科書連携設定の一覧を取得"
)
async def get_study_settings(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher),
    team_id: uuid.UUID = None # 特定のチームIDで絞り込む
):
    """
    自身が管理するチームの教科書連携設定（試験範囲など）の一覧を取得します。（教師権限が必要）
    """
    query = """
        SELECT ss.* FROM study_settings ss
        JOIN teams t ON ss.team_id = t.id
        WHERE t.created_by = $1
    """
    params = [current_teacher.id]

    if team_id:
        query += " AND t.id = $2"
        params.append(team_id)

    query += " ORDER BY ss.created_at DESC"
    
    settings_records = await conn.fetch(query, *params)

    # 各設定に関連するタグを取得
    result_list = []
    for record in settings_records:
        details = await _get_study_setting_details(conn, record['id'])
        result_list.append(details)

    return result_list


@router.post(
    "/",
    response_model=curriculum_schema.StudySetting,
    status_code=status.HTTP_201_CREATED,
    summary="【教師用】新規の教科書連携設定を作成"
)
async def create_study_setting(
    setting_in: curriculum_schema.StudySettingCreate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    新しい教科書連携設定（試験範囲など）を作成します。（教師権限が必要）
    """
    # 1. 教師が対象チームのオーナーであることを確認
    await _verify_team_owner(setting_in.team_id, conn, current_teacher)

    # 2. データベースのトランザクションを開始
    async with conn.transaction():
        # 3. study_settingsテーブルに本体を登録
        new_setting_record = await conn.fetchrow(
            """
            INSERT INTO study_settings (team_id, teacher_id, setting_name, exam_range_start, exam_range_end)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            setting_in.team_id,
            current_teacher.id,
            setting_in.setting_name,
            setting_in.exam_range_start,
            setting_in.exam_range_end
        )

        # 4. study_setting_tagsテーブルに関連タグを登録
        # TODO: tag_idsの存在確認
        tags_list = []
        for tag_id in setting_in.tag_ids:
            await conn.execute(
                "INSERT INTO study_setting_tags (study_setting_id, tag_id) VALUES ($1, $2)",
                new_setting_record['id'], tag_id
            )
            tag_record = await conn.fetchrow("SELECT id, name FROM tags WHERE id = $1", tag_id)
            if tag_record:
                tags_list.append(tag_record)

    return {**new_setting_record, "tags": tags_list}


@router.put(
    "/{setting_id}",
    response_model=curriculum_schema.StudySetting,
    summary="【教師用】教科書連携設定を更新"
)
async def update_study_setting(
    setting_id: uuid.UUID,
    setting_in: curriculum_schema.StudySettingUpdate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    既存の教科書連携設定を更新します。（教師権限が必要）
    """
    # 1. 設定が存在し、かつ教師がオーナーであるか確認
    setting = await conn.fetchrow(
        """
        SELECT ss.* FROM study_settings ss
        JOIN teams t ON ss.team_id = t.id
        WHERE ss.id = $1 AND t.created_by = $2
        """,
        setting_id, current_teacher.id
    )
    if not setting:
        raise HTTPException(status_code=status.HTTP_4_04_NOT_FOUND, detail="Setting not found or you do not have permission")

    # 2. トランザクション内で更新
    async with conn.transaction():
        # 3. study_settingsテーブル本体を更新 (部分更新)
        update_data = setting_in.model_dump(exclude_unset=True)
        # tag_idsは別で処理するので除外
        tag_ids = update_data.pop('tag_ids', None)

        if update_data: # 更新するフィールドが何かあれば
            set_clause = ", ".join([f"{key} = ${i+1}" for i, key in enumerate(update_data.keys())])
            values = list(update_data.values())
            values.append(setting_id)
            
            await conn.execute(
                f"UPDATE study_settings SET {set_clause}, updated_at = NOW() WHERE id = ${len(values)}",
                *values
            )

        # 4. タグの関連付けを更新 (指定があった場合のみ)
        if tag_ids is not None:
            # 既存のタグ関連をすべて削除
            await conn.execute("DELETE FROM study_setting_tags WHERE study_setting_id = $1", setting_id)
            # 新しいタグ関連を挿入
            for tag_id in tag_ids:
                await conn.execute(
                    "INSERT INTO study_setting_tags (study_setting_id, tag_id) VALUES ($1, $2)",
                    setting_id, tag_id
                )

    # 5. 更新後の完全なデータを取得して返す
    updated_setting_details = await _get_study_setting_details(conn, setting_id)
    return updated_setting_details


@router.delete(
    "/{setting_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="【教師用】教科書連携設定を削除"
)
async def delete_study_setting(
    setting_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    既存の教科書連携設定を削除します。（教師権限が必要）
    """
    # 1. 設定が存在し、かつ教師がオーナーであるか確認
    setting = await conn.fetchrow(
        """
        SELECT ss.id FROM study_settings ss
        JOIN teams t ON ss.team_id = t.id
        WHERE ss.id = $1 AND t.created_by = $2
        """,
        setting_id, current_teacher.id
    )
    if not setting:
        raise HTTPException(status_code=status.HTTP_4_04_NOT_FOUND, detail="Setting not found or you do not have permission")

    # 2. 削除を実行 (関連するタグもCASCADE DELETEされる想定だが、安全のためトランザクションで手動削除)
    async with conn.transaction():
        await conn.execute("DELETE FROM study_setting_tags WHERE study_setting_id = $1", setting_id)
        await conn.execute("DELETE FROM study_settings WHERE id = $1", setting_id)

    return
