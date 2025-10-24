from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    """
    ログイン成功時にクライアントに返却するアクセストークンのスキーマ。
    """
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    """
    JWT (JSON Web Token) のペイロード（内部データ）のスキーマ。
    sub (subject) には通常、ユーザーを一意に識別する情報（今回はメールアドレス）を格納します。
    """
    sub: Optional[str] = None