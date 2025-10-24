import uuid
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

# --- Request Schemas ---
class TeamJoin(BaseModel):
    """
    【生徒用】チーム参加時に受け取るデータ形式
    """
    join_code: str = Field(..., min_length=6, max_length=6, description="6桁のチーム参加コード")

class TeamCreate(BaseModel):
    """
    【教師用】新規チーム作成時に受け取るデータ形式
    """
    name: str = Field(..., min_length=1, max_length=200, description="チーム名（例: 3年1組）")


# --- Response Schemas ---
class Team(BaseModel):
    """
    APIからレスポンスとして返される基本的なチーム情報
    """
    id: uuid.UUID
    name: str
    join_code: str
    created_at: datetime

    class Config:
        from_attributes = True # DBのORMオブジェクトからモデルへの変換を有効にする


# --- ★★★ ここから新規追加 ★★★ ---
class TeamStudent(BaseModel):
    """
    【教師用】チームに所属する生徒の簡易情報
    """
    user_id: uuid.UUID
    nickname: Optional[str] = None
    email: str
    joined_at: datetime

    class Config:
        from_attributes = True

class TeamDetails(Team):
    """
    【教師用】チーム詳細（生徒一覧を含む）
    """
    students: List[TeamStudent] = []
    # TODO: 必要に応じて学習統計のサマリーなどを追加
