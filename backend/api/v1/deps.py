from typing import AsyncGenerator

import asyncpg
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError

from core import security
from core.config import settings
from schemas.token import TokenPayload
from schemas.user import User

# --- OAuth2 スキーマの定義 ---
# トークンを取得するためのAPIエンドポイントのURLを指定します。
# このURLは、auth.pyで定義するログインAPIのパスと一致している必要があります。
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    データベース接続の依存性。
    リクエストごとにコネクションプールから接続を取得し、
    処理が完了したらクローズ（プールに返却）します。
    """
    conn = None
    try:
        # 設定ファイルからデータベースURLを取得して接続
        conn = await asyncpg.connect(settings.DATABASE_URL)
        yield conn
    finally:
        if conn:
            await conn.close()


async def get_current_user(
    conn: asyncpg.Connection = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    """
    リクエストヘッダーのJWTを検証し、現在のユーザー情報を取得する依存性。
    """
    try:
        # トークンをデコードしてペイロードを取得
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        # ペイロードをTokenPayloadスキーマで検証
        token_data = TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        # トークンが無効な場合は認証エラーを発生させる
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # トークンからユーザーのメールアドレスを取得し、DBからユーザーを検索
    user_record = await conn.fetchrow(
        "SELECT * FROM users WHERE email = $1", token_data.sub
    )

    if not user_record:
        # ユーザーが見つからない場合も認証エラー
        raise HTTPException(status_code=404, detail="User not found")
    
    # DBから取得したレコードをUserスキーマに変換して返す
    return User(**user_record)
