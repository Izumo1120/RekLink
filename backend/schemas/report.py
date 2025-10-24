import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal, Optional, List

# 指摘カテゴリとして許可する文字列を定義
ReportCategory = Literal['major_error', 'minor_error', 'improvement']
ReportStatus = Literal['pending', 'in_progress', 'resolved', 'rejected']

# --- Request Schemas ---
class ReportCreate(BaseModel):
    """
    【生徒用】コンテンツへの指摘を投稿する際に受け取るデータ形式
    """
    content_id: uuid.UUID
    category: ReportCategory
    description: str = Field(..., min_length=10, max_length=2000, description="指摘内容の詳細")


# --- ★★★ ここから新規追加 ★★★ ---
class ReportStatusUpdate(BaseModel):
    """
    【教師用】指摘のステータスを更新する際に受け取るデータ形式
    """
    status: ReportStatus
    resolution_note: Optional[str] = Field(None, max_length=2000, description="対応内容のメモ")
# --- ★★★ ここまで新規追加 ★★★ ---


# --- Response Schemas ---
class Report(BaseModel):
    """
    【生徒用】APIからレスポンスとして返される、自身の指摘履歴のデータ形式
    """
    id: uuid.UUID
    content_id: uuid.UUID
    category: ReportCategory
    description: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- ★★★ ここから新規追加 ★★★ ---
class ReportDetails(Report):
    """
    【教師用】指摘一覧で表示するための詳細な指摘情報
    """
    reporter_id: uuid.UUID
    reporter_nickname: Optional[str] = None
    content_title: str
    
    class Config:
        from_attributes = True

class ContentForReport(BaseModel):
    """
    【教師用】指摘対象のコンテンツ内容を取得するためのデータ形式
    """
    id: uuid.UUID
    content_type: str
    title: str
    content: str
    explanation: Optional[str] = None
    # TODO: クイズの場合は選択肢も表示する
    # options: List[...] 

    class Config:
        from_attributes = True
# --- ★★★ ここまで新規追加 ★★★ ---