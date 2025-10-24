import uuid
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Union

# 既存のコンテンツスキーマをインポート
from schemas.content import Quiz, Trivia

# --- Response Schemas ---

class Notification(BaseModel):
    """
    【共通】APIからレスポンスとして返される通知のデータ形式
    """
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    message: str
    related_content_id: Optional[uuid.UUID] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SearchResult(BaseModel):
    """
    【共通】検索結果のデータ形式
    """
    # 検索結果はクイズか豆知識のどちらか
    items: List[Union[Quiz, Trivia]] = []
    total: int = 0
