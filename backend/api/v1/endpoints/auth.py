import uuid
from datetime import timedelta

import asyncpg
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import status # statusをインポート

from api.v1 import deps
from core import security
from core.config import settings
from schemas import user, token

router = APIRouter()


@router.post("/register", response_model=user.User, status_code=status.HTTP_201_CREATED) # 201 Created を使用
async def register(
    user_in: user.UserCreate,
    conn: asyncpg.Connection = Depends(deps.get_db)
):
    """
    新規ユーザー登録
    """
    # 既に同じメールアドレスのユーザーが存在するか確認
    existing_user = await conn.fetchrow(
        "SELECT email FROM users WHERE email = $1", user_in.email
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    hashed_password = security.get_password_hash(user_in.password)
    
    # データベースに新しいユーザーを挿入
    # RETURNING * を使って挿入したレコードをすぐに取得
    new_user_record = await conn.fetchrow(
        """
        INSERT INTO users (email, password_hash, nickname, role)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        user_in.email,
        hashed_password,
        user_in.nickname,
        user_in.role
    )
    
    # ★★★ ここを修正 ★★★
    # asyncpg.Record を dict に変換してから返す
    return dict(new_user_record)


@router.post("/login", response_model=token.Token)
async def login(
    conn: asyncpg.Connection = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    ユーザーログイン。OAuth2互換のフォームデータ（username, password）を受け取り、
    アクセストークンを返却します。
    """
    user_record = await conn.fetchrow(
        "SELECT * FROM users WHERE email = $1", form_data.username
    )
    if not user_record or not security.verify_password(form_data.password, user_record['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        # ★★★ ここを修正 ★H★
        # Pydanticモデルではなく、dictからキーを正しく参照する
        data={"sub": user_record['email']}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout():
    """
    ログアウト。JWTはクライアントサイドで無効化されるため、サーバーサイドでは
    成功メッセージを返すのみとします。
    """
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=user.User)
async def read_users_me(
    current_user: user.User = Depends(deps.get_current_user)
):
    """
    現在のユーザー情報を取得します。（要認証）
    """
    return current_user


@router.put("/profile", response_model=user.User)
async def update_user_profile(
    user_in: user.UserUpdate,
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user.User = Depends(deps.get_current_user)
):
    """
    現在のユーザーのプロフィール（ニックネーム、プロフィール画像、パスワード）を更新します。（要認証）
    """
    # 更新するフィールドと値を動的に構築
    update_fields = []
    values = []
    
    # Bodyから受け取った値がNoneでない場合のみ更新対象に加える
    if user_in.nickname is not None:
        update_fields.append("nickname = ${}")
        values.append(user_in.nickname)
        
    if user_in.profile_image_url is not None:
        update_fields.append("profile_image_url = ${}")
        values.append(user_in.profile_image_url)
        
    if user_in.password is not None:
        hashed_password = security.get_password_hash(user_in.password)
        update_fields.append("password_hash = ${}")
        values.append(hashed_password)

    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    # SQLクエリを生成
    set_clause = ", ".join([field.format(i + 1) for i, field in enumerate(update_fields)])
    values.append(current_user.id) # WHERE句のためのID
    
    query = f"""
        UPDATE users
        SET {set_clause}, updated_at = NOW()
        WHERE id = ${len(values)}
        RETURNING *
    """
    
    updated_user_record = await conn.fetchrow(query, *values)

    if not updated_user_record:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # ★★★ ここを修正 ★★★
    # asyncpg.Record を dict に変換してから返す
    return dict(updated_user_record)


@router.delete("/account", status_code=status.HTTP_200_OK)
async def delete_account(
    conn: asyncpg.Connection = Depends(deps.get_db),
    current_user: user.User = Depends(deps.get_current_user)
):
    """
    現在のアカウントを削除します。（要認証）
    """
    await conn.execute("DELETE FROM users WHERE id = $1", current_user.id)
    return {"message": "Account deleted successfully"}

