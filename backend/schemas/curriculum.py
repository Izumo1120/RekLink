import uuid
from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Optional

# --- Request Schemas ---
class StudySettingCreate(BaseModel):
    """
    【教師用】新規の教科書連携設定（試験範囲など）を作成する際のデータ形式
    """
    team_id: uuid.UUID
    setting_name: str = Field(..., min_length=1, max_length=200, description="設定名（例: 前期中間試験）")
    exam_range_start: Optional[date] = None
    exam_range_end: Optional[date] = None
    tag_ids: List[uuid.UUID] = Field(..., description="この設定に関連付けるタグのIDリスト")


class StudySettingUpdate(BaseModel):
    """
    【教師用】既存の教科書連携設定を更新する際のデータ形式
    """
    setting_name: Optional[str] = Field(None, min_length=1, max_length=200)
    exam_range_start: Optional[date] = None
    exam_range_end: Optional[date] = None
    tag_ids: Optional[List[uuid.UUID]] = None


# --- Response Schemas ---
class StudySettingTag(BaseModel):
    """
    設定に関連付けられたタグの情報
    """
    id: uuid.UUID
    name: str

    class Config:
        from_attributes = True

class StudySetting(BaseModel):
    """
    【教師用】APIからレスポンスとして返される教科書連携設定のデータ形式
    """
    id: uuid.UUID
    team_id: uuid.UUID
    teacher_id: uuid.UUID
    setting_name: str
    exam_range_start: Optional[date] = None
    exam_range_end: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    tags: List[StudySettingTag] = []

    class Config:
        from_attributes = True