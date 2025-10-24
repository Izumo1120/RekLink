import uuid
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

# --- Request Schemas ---

class TeacherCreate(BaseModel):
    """
    【管理者用】新規教師アカウント作成時に受け取るデータ形式
    """
    email: EmailStr
    password: str = Field(..., min_length=8)
    nickname: str = Field(..., min_length=1, max_length=100)


class TeacherStatusUpdate(BaseModel):
    """
    【管理者用】教師アカウントのステータス（有効/無効）を更新する際のデータ形式
    """
    is_active: bool


# --- Response Schemas ---

class BulkUploadResult(BaseModel):
    """
    【管理者用】生徒CSV一括登録の処理結果
    """
    total_rows: int
    successful_imports: int
    failed_imports: int
    errors: List[str] = []
