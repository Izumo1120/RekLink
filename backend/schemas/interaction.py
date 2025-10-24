import uuid
from datetime import datetime
from pydantic import BaseModel, Field

# interaction_typeとして許可する文字列を定義
InteractionType = Field(..., pattern="^(like|save|share)$")

class InteractionBase(BaseModel):
    """
    インタラクションの基本となるスキーマ
    """
    content_id: uuid.UUID
    interaction_type: str = InteractionType


class InteractionCreate(BaseModel):
    """
    APIでインタラクションを作成する際に使用するスキーマ（実際にはエンドポイント側でデータが決定される）
    """
    pass # ボディは空


class Interaction(InteractionBase):
    """
    APIからレスポンスとして返されるインタラクション情報のデータ形式
    """
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True # DBのORMオブジェクトからモデルへの変換を有効にする
