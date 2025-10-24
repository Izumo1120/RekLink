import uuid
import asyncpg
import csv
import io
from typing import List
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
)

from api.v1 import deps
from schemas import user as user_schema
from schemas import admin as admin_schema
from core import security

router = APIRouter()

# --- 依存関係 ---

async def get_current_admin(
    current_user: user_schema.User = Depends(deps.get_current_user)
) -> user_schema.User:
    """
    現在のユーザーが管理者（admin）であることを確認する依存関係
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action"
        )
    return current_user


# ---------------------------------------------------------------------------
# 教師アカウント管理 API
# ---------------------------------------------------------------------------

@router.get(
    "/teachers",
    response_model=List[user_schema.User],
    summary="【管理者用】教師アカウント一覧を取得"
)
async def get_teachers(
    conn: asyncpg.Connection = Depends(deps.get_db),
    admin: user_schema.User = Depends(get_current_admin)
):
    """
    すべての教師アカウントの一覧を取得します。（管理者権限が必要）
    """
    teachers = await conn.fetch("SELECT * FROM users WHERE role = 'teacher' ORDER BY created_at DESC")
    return teachers


@router.post(
    "/teachers",
    response_model=user_schema.User,
    status_code=status.HTTP_201_CREATED,
    summary="【管理者用】新規教師アカウントを作成"
)
async def create_teacher(
    teacher_in: admin_schema.TeacherCreate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    admin: user_schema.User = Depends(get_current_admin)
):
    """
    新しい教師アカウントを作成します。（管理者権限が必要）
    """
    # 既に同じメールアドレスのユーザーが存在するか確認
    existing_user = await conn.fetchrow(
        "SELECT email FROM users WHERE email = $1", teacher_in.email
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    hashed_password = security.get_password_hash(teacher_in.password)
    
    # データベースに新しい教師を挿入
    new_teacher_record = await conn.fetchrow(
        """
        INSERT INTO users (email, password_hash, nickname, role)
        VALUES ($1, $2, $3, 'teacher')
        RETURNING *
        """,
        teacher_in.email,
        hashed_password,
        teacher_in.nickname
    )
    
    return new_teacher_record


@router.put(
    "/teachers/{teacher_id}/status",
    response_model=user_schema.User,
    summary="【管理者用】教師アカウントのステータス（有効/無効）を変更"
)
async def update_teacher_status(
    teacher_id: uuid.UUID,
    status_in: admin_schema.TeacherStatusUpdate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    admin: user_schema.User = Depends(get_current_admin)
):
    """
    教師アカウントの有効（is_active）状態を更新します。（管理者権限が必要）
    """
    updated_teacher = await conn.fetchrow(
        """
        UPDATE users
        SET is_active = $1, updated_at = NOW()
        WHERE id = $2 AND role = 'teacher'
        RETURNING *
        """,
        status_in.is_active, teacher_id
    )
    
    if not updated_teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
        
    return updated_teacher


@router.delete(
    "/teachers/{teacher_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="【管理者用】教師アカウントを削除"
)
async def delete_teacher(
    teacher_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    admin: user_schema.User = Depends(get_current_admin)
):
    """
    教師アカウントを削除します。（管理者権限が必要）
    """
    result = await conn.execute(
        "DELETE FROM users WHERE id = $1 AND role = 'teacher'", teacher_id
    )
    if result == 'DELETE 0':
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    return


# ---------------------------------------------------------------------------
# 生徒・コンテンツ管理 API
# ---------------------------------------------------------------------------

@router.post(
    "/students/bulk-upload",
    response_model=admin_schema.BulkUploadResult,
    summary="【管理者用】生徒アカウントをCSVで一括登録"
)
async def bulk_upload_students(
    file: UploadFile = File(...),
    conn: asyncpg.Connection = Depends(deps.get_db),
    admin: user_schema.User = Depends(get_current_admin)
):
    """
    生徒アカウントをCSVファイルで一括登録します。（管理者権限が必要）
    CSVの形式: email, password, nickname
    """
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Please upload a CSV.")

    contents = await file.read()
    decoded_content = contents.decode('utf-8')
    csv_reader = csv.reader(io.StringIO(decoded_content))
    
    header = next(csv_reader, None)
    if not header or header != ['email', 'password', 'nickname']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid CSV header. Expected: email, password, nickname")

    result = {
        "total_rows": 0,
        "successful_imports": 0,
        "failed_imports": 0,
        "errors": []
    }

    async with conn.transaction():
        for i, row in enumerate(csv_reader):
            result["total_rows"] += 1
            if len(row) != 3:
                result["failed_imports"] += 1
                result["errors"].append(f"Row {i+1}: Invalid number of columns")
                continue
            
            email, password, nickname = row
            
            # TODO: email, password, nickname のバリデーション
            
            try:
                hashed_password = security.get_password_hash(password)
                await conn.execute(
                    """
                    INSERT INTO users (email, password_hash, nickname, role)
                    VALUES ($1, $2, $3, 'student')
                    """,
                    email, hashed_password, nickname
                )
                result["successful_imports"] += 1
            except asyncpg.exceptions.UniqueViolationError:
                result["failed_imports"] += 1
                result["errors"].append(f"Row {i+1}: Email '{email}' already exists.")
            except Exception as e:
                result["failed_imports"] += 1
                result["errors"].append(f"Row {i+1}: An unexpected error occurred: {e}")

    return result


@router.delete(
    "/content/{content_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="【管理者用】コンテンツを強制削除"
)
async def delete_content(
    content_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(deps.get_db),
    admin: user_schema.User = Depends(get_current_admin)
):
    """
    不適切な投稿など、任意のコンテンツをシステムから強制的に削除します。（管理者権限が必要）
    """
    result = await conn.execute(
        "DELETE FROM contents WHERE id = $1", content_id
    )
    if result == 'DELETE 0':
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    return
