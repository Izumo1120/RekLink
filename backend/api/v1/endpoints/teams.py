import uuid
import asyncpg
import random
import string
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from api.v1 import deps
from schemas import team as team_schema
from schemas import user as user_schema

router = APIRouter()

# --- ヘルパー関数 ---

def _generate_join_code() -> str:
    """
    6桁の数字の参加コードを生成する
    """
    return "".join(random.choices(string.digits, k=6))

async def get_current_teacher(
    current_user: user_schema.User = Depends(deps.get_current_user)
) -> user_schema.User:
    """
    現在のユーザーが教師であることを確認する依存関係
    """
    if current_user.role != 'teacher':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )
    return current_user

async def _verify_team_owner(
    team_id: uuid.UUID,
    conn: asyncpg.Connection,
    teacher: user_schema.User
):
    """
    教師がそのチームの所有者であることを確認する
    """
    # ★★★ 修正 ★★★: 'SELECT id, created_by' から 'SELECT *' に変更
    # これにより、id, created_by だけでなく、name, join_code なども取得される
    team = await conn.fetchrow(
        "SELECT * FROM teams WHERE id = $1", team_id
    )
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    if team['created_by'] != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the owner of this team"
        )
    return team


# ---------------------------------------------------------------------------
# 生徒向け API (既存)
# ---------------------------------------------------------------------------

@router.post(
    "/join",
    response_model=team_schema.Team,
    summary="【生徒用】チームに参加する"
)
async def join_team(
    team_in: team_schema.TeamJoin,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    参加コードを使用してチームに参加します。（要認証）
    """
    if current_user.role != 'student':
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can join teams")

    existing_membership = await conn.fetchrow(
        "SELECT team_id FROM team_members WHERE user_id = $1", current_user.id
    )
    if existing_membership:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already in a team")

    target_team = await conn.fetchrow(
        "SELECT * FROM teams WHERE join_code = $1 AND is_active = TRUE", team_in.join_code
    )
    if not target_team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team with this join code not found or is inactive")

    await conn.execute(
        "INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)",
        target_team['id'], current_user.id
    )

    # ★★★ 修正 ★★★
    # asyncpg.Record を dict に変換
    return dict(target_team)


@router.get(
    "/me",
    response_model=team_schema.Team,
    summary="【生徒用】自身が所属するチーム情報を取得"
)
async def get_my_team(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user_schema.User = Depends(deps.get_current_user)
):
    """
    自身が所属するチームの情報を取得します。（要認証）
    """
    my_team = await conn.fetchrow(
        """
        SELECT t.id, t.name, t.join_code, t.created_at
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND t.is_active = TRUE
        """,
        current_user.id
    )
    if not my_team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not part of any active team")

    # ★★★ 修正 ★★★
    # asyncpg.Record を dict に変換
    return dict(my_team)


# ---------------------------------------------------------------------------
# 教師向け API (新規追加)
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=team_schema.Team,
    status_code=status.HTTP_201_CREATED,
    summary="【教師用】新規チームを作成する"
)
async def create_team(
    team_in: team_schema.TeamCreate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    新しいチーム（クラス）を作成します。作成時に一意の参加コードが自動生成されます。（教師権限が必要）
    """
    join_code = _generate_join_code()

    new_team_record = await conn.fetchrow(
        """
        INSERT INTO teams (name, join_code, created_by)
        VALUES ($1, $2, $3)
        RETURNING *
        """,
        team_in.name, join_code, current_teacher.id
    )
    
    # ★★★ 修正 ★★★
    # asyncpg.Record を dict に変換
    return dict(new_team_record)


@router.get(
    "/",
    response_model=List[team_schema.Team],
    summary="【教師用】自身が管理するチーム一覧を取得"
)
async def get_my_teams(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    自身が作成したチームの一覧を取得します。（教師権限が必要）
    """
    teams_records = await conn.fetch(
        "SELECT * FROM teams WHERE created_by = $1 AND is_active = TRUE ORDER BY created_at DESC",
        current_teacher.id
    )
    
    # ★★★ 修正 ★★★
    # Recordのリストをdictのリストに変換
    return [dict(team) for team in teams_records]


@router.get(
    "/{team_id}",
    response_model=team_schema.TeamDetails,
    summary="【教師用】チーム詳細（生徒一覧含む）を取得"
)
async def get_team_details(
    team_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    自身が管理する特定のチームの詳細情報を、所属する生徒一覧と共に取得します。（教師権限が必要）
    """
    # _verify_team_owner が完全なチーム情報を返すようになったため、
    # team_record には name や join_code も含まれている
    team_record = await _verify_team_owner(team_id, conn, current_teacher)

    student_records = await conn.fetch(
        """
        SELECT u.id as user_id, u.nickname, u.email, tm.joined_at
        FROM users u
        JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = $1
        ORDER BY u.nickname
        """,
        team_id
    )
    
    # Record と Recordのリストを dict に変換
    return {**dict(team_record), "students": [dict(s) for s in student_records]}


@router.get(
    "/{team_id}/students",
    response_model=List[team_schema.TeamStudent],
    summary="【教師用】チームの生徒一覧を取得"
)
async def get_team_students(
    team_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    自身が管理する特定のチームに所属する生徒の一覧を取得します。（教師権限が必要）
    """
    await _verify_team_owner(team_id, conn, current_teacher)

    student_records = await conn.fetch(
        """
        SELECT u.id as user_id, u.nickname, u.email, tm.joined_at
        FROM users u
        JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = $1
        ORDER BY u.nickname
        """,
        team_id
    )
    
    # ★★★ 修正 ★★★
    # Recordのリストをdictのリストに変換
    return [dict(s) for s in student_records]


@router.post(
    "/{team_id}/regenerate-code",
    response_model=team_schema.Team,
    summary="【教師用】チームの参加コードを再生成"
)
async def regenerate_join_code(
    team_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    チームの参加コードを新しく再生成します。（教師権限が必要）
    """
    await _verify_team_owner(team_id, conn, current_teacher)

    new_join_code = _generate_join_code()
    updated_team_record = await conn.fetchrow(
        """
        UPDATE teams
        SET join_code = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
        """,
        new_join_code, team_id
    )
    
    # ★★★ 修正 ★★★
    # asyncpg.Record を dict に変換
    return dict(updated_team_record)

