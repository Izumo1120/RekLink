import uuid
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# contentスキーマと
from schemas import content as content_schema


# --- Base Schemas ---
# 複数のスキーマで共通して使用するフィールドを定義
class UserBase(BaseModel):
    email: EmailStr
    nickname: Optional[str] = None
    role: str = 'student'

# --- Request Schemas ---
# APIにリクエストとして送られるデータ形式を定義
class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    profile_image_url: Optional[str] = None
    password: Optional[str] = None


# --- Response Schemas ---
# APIからレスポンスとして返されるデータ形式を定義
class User(UserBase):
    id: uuid.UUID
    profile_image_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- マイページ用の学習統計情報 ---
class UserStats(BaseModel):
    """
    マイページで表示するための個人の学習統計情報
    """
    total_quizzes_answered: int = Field(..., description="解答したクイズの総数")
    correct_answers: int = Field(..., description="正解した数")
    accuracy: float = Field(..., ge=0, le=100, description="正答率 (%)")
    posts_created: int = Field(..., description="作成した投稿（クイズ＋豆知識）の総数")


# --- ★★★ ここから新規追加 ★★★ ---

# --- 【教師用】生徒詳細情報 ---
class StudentDetails(BaseModel):
    """
    【教師用】特定の生徒の詳細な学習情報
    """
    profile: User
    stats: UserStats
    recent_posts: List[content_schema.ContentInfo]
    recent_answers: List[content_schema.UserAnswer]

