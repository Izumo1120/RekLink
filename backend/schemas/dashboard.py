import uuid
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# 既存のスキーマをインポート
from schemas import user as user_schema
from schemas import content as content_schema

# --- Response Schemas ---

class DashboardSummary(BaseModel):
    """
    【教師用】ダッシュボードのサマリー情報
    """
    total_students: int = Field(..., description="チームの総生徒数")
    total_quizzes_answered: int = Field(..., description="全生徒のクイズ総解答数")
    overall_accuracy: float = Field(..., ge=0, le=100, description="チーム全体の平均正答率 (%)")
    total_posts_created: int = Field(..., description="全生徒の総投稿数")
    pending_reports_count: int = Field(..., description="未対応の指摘数")


class PopularTag(BaseModel):
    """
    【教師用】人気のタグ情報
    """
    tag_id: uuid.UUID
    tag_name: str
    usage_count: int

    class Config:
        from_attributes = True


class StudentDashboardDetails(BaseModel):
    """
    【教師用】特定の生徒のダッシュボード詳細
    (endpoints/students.py の get_student_details の戻り値に対応)
    """
    profile: user_schema.User
    stats: user_schema.UserStats
    recent_posts: List[content_schema.ContentInfo]
    recent_answers: List[content_schema.UserAnswer]


class WeeklyActivity(BaseModel):
    """
    【教師用】週間活動データ
    """
    date: str = Field(..., description="日付 (YYYY-MM-DD)")
    posts: int = Field(..., description="投稿数")
    answers: int = Field(..., description="解答数")

    class Config:
        from_attributes = True
