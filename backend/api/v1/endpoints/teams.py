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

@router.get(
    "/{team_id}/members",
    response_model=team_schema.TeamMembersListResponse,
    summary="【教師用】チームメンバーの詳細な学習状況一覧を取得"
)
async def get_team_members_with_learning_summary(
    team_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_teacher: user_schema.User = Depends(get_current_teacher)
):
    """
    チーム詳細ページ（メンバー一覧）に必要な、生徒の学習サマリーを含む
    すべての情報を集計して返します。（教師権限が必要）
    """
    
    # 1. 教師がチームのオーナーであることを確認 (team_record が返ってくる)
    team_record = await _verify_team_owner(team_id, conn, current_teacher)

    # 2. 非常に複雑な集計クエリ
    #    Common Table Expressions (WITH句) を使い、複数の集計を事前に行う
    query = """
    WITH team_members AS (
        -- 1. このチームのメンバーリストを取得
        SELECT u.id, u.nickname, u.email, tm.joined_at
        FROM users u
        JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = $1 AND u.role = 'student'
    ),
    posts AS (
        -- 2. メンバーの投稿数を集計
        SELECT author_id, COUNT(*) AS posts_count
        FROM contents
        WHERE author_id = ANY(SELECT id FROM team_members)
        GROUP BY author_id
    ),
    answers AS (
        -- 3. メンバーの解答数と正解数を集計
        SELECT
            user_id,
            COUNT(*) AS answers_count,
            COUNT(*) FILTER (WHERE is_correct = TRUE) AS correct_answers_count
        FROM user_answers
        WHERE user_id = ANY(SELECT id FROM team_members)
        GROUP BY user_id
    ),
    activity AS (
        -- 4. メンバーの最終活動日 (投稿 または 解答) を取得
        SELECT
            user_id,
            MAX(action_at) AS last_activity_at
        FROM (
            SELECT author_id AS user_id, created_at AS action_at FROM contents WHERE author_id = ANY(SELECT id FROM team_members)
            UNION ALL
            SELECT user_id, answered_at AS action_at FROM user_answers WHERE user_id = ANY(SELECT id FROM team_members)
        ) AS all_actions
        GROUP BY user_id
    )
    -- 5. すべてのデータを結合して最終的なメンバーリストを生成
    SELECT
        tm.id AS user_id,
        tm.nickname,
        tm.email,
        tm.joined_at,
        COALESCE(p.posts_count, 0) AS posts_count,
        COALESCE(a.answers_count, 0) AS answers_count,
        COALESCE(a.correct_answers_count, 0) AS correct_answers_count,
        act.last_activity_at,
        (act.last_activity_at > NOW() - INTERVAL '7 days') AS is_active
    FROM
        team_members tm
    LEFT JOIN posts p ON tm.id = p.author_id
    LEFT JOIN answers a ON tm.id = a.user_id
    LEFT JOIN activity act ON tm.id = act.user_id
    ORDER BY
        tm.nickname;
    """
    
    member_records = await conn.fetch(query, team_id)

    # 3. 取得したデータをレスポンスの形に整形
    members_list = []
    total_posts = 0
    total_answers = 0
    total_correct = 0
    active_count = 0

    for r in member_records:
        accuracy = 0.0
        if r['answers_count'] > 0:
            accuracy = (r['correct_answers_count'] / r['answers_count']) * 100
        
        if r['is_active']:
            active_count += 1
        
        total_posts += r['posts_count']
        total_answers += r['answers_count']
        total_correct += r['correct_answers_count']

        members_list.append({
            "user_id": r['user_id'],
            "nickname": r['nickname'],
            "email": r['email'],
            "joined_at": r['joined_at'],
            "learning_summary": {
                "posts_count": r['posts_count'],
                "answers_count": r['answers_count'],
                "accuracy": accuracy,
                "last_activity_at": r['last_activity_at'],
                "is_active": r['is_active']
            }
        })
    
    # 4. チーム全体のサマリーを計算
    total_members = len(members_list)
    avg_posts = (total_posts / total_members) if total_members > 0 else 0
    overall_accuracy = (total_correct / total_answers) * 100 if total_answers > 0 else 0

    return {
        "team_id": team_id,
        "team_name": team_record['name'],
        "total_members": total_members,
        "active_members_count": active_count,
        "average_posts_per_member": avg_posts,
        "overall_average_accuracy": overall_accuracy,
        "members": members_list
    }