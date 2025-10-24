import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv()

class Settings(BaseSettings):
    """
    環境変数から設定を読み込むためのクラス
    """
    # --- アプリケーション設定 ---
    PROJECT_NAME: str = "RekLink API"
    API_V1_STR: str = "/api/v1"

    # --- セキュリティ & JWT設定 ---
    # `openssl rand -hex 32` コマンドなどで強力なキーを生成することを推奨
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default_secret_key")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8日間

    # --- データベース設定 ---
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "db") # docker-composeのサービス名
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "postgres") # デフォルトのDB名

    # データベース接続URLを生成
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        case_sensitive = True

# Settingsクラスのインスタンスを作成して、どこからでもインポートできるようにする
settings = Settings()