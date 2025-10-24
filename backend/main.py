from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# api.pyで作成した司令塔となるapi_routerをインポートします
from api.v1.api import api_router
from core.config import settings

# FastAPIアプリケーションのインスタンスを作成
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="歴史学習アプリ「RekLink」のAPI",
    version="1.7.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# --- CORS (Cross-Origin Resource Sharing) の設定 ---
origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ★★★ 最も重要な部分 ★★★ ---
# /api/v1 という共通のパスで、api_router（api.pyで定義）に束ねられた
# すべてのAPIエンドポイントをアプリケーションに登録します。
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def read_root():
    """
    APIサーバーの起動確認用エンドポイント。
    """
    return {"message": "Welcome to RekLink API!"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True
    )

