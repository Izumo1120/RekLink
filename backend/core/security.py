from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
from passlib.context import CryptContext

from core.config import settings

# --- パスワードハッシュ化の設定 ---
# "bcrypt"アルゴリズムを使用してパスワードをハッシュ化するためのコンテキストを作成
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- JWTの設定 ---
# JWTの署名に使用するアルゴリズム
ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    平文のパスワードとハッシュ化されたパスワードを比較し、一致するか検証します。

    :param plain_password: ユーザーが入力した平文のパスワード
    :param hashed_password: データベースに保存されているハッシュ化されたパスワード
    :return: パスワードが一致すればTrue, そうでなければFalse
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    平文のパスワードを受け取り、そのハッシュ値を生成します。

    :param password: ハッシュ化する平文のパスワード
    :return: ハッシュ化されたパスワード文字列
    """
    return pwd_context.hash(password)


def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    """
    与えられたデータ（ペイロード）を含むJWTアクセストークンを生成します。

    :param data: トークンに含めるデータ（例: {"sub": "user@example.com"}）
    :param expires_delta: トークンの有効期限（timedeltaオブジェクト）。指定されない場合はデフォルト値が使用されます。
    :return: エンコードされたJWTアクセストークン文字列
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # 有効期限が指定されなかった場合、設定ファイルからデフォルト値（例: 15分）を取得
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt