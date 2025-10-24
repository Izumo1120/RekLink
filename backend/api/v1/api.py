from fastapi import APIRouter

# endpointsフォルダから、作成したauth.pyをインポートします
from api.v1.endpoints import (
    auth,
    teams,
    contents,
    interactions,
    reports,
    users,
    students,
    dashboard,
    curriculum,
    admin,
    common,
)

api_router = APIRouter()

# 各API群を、それぞれのURLパスで登録します
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(users.router, prefix="/users", tags=["users"])

# contents.py のルーターは、クイズや豆知識の本体を扱う
# 例: /quizzes, /facts
api_router.include_router(contents.router, tags=["contents"])

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
# interactions.py のルーターは、コンテンツへの操作を扱う
# 例: /contents/{content_id}/like
api_router.include_router(interactions.router, prefix="/contents", tags=["interactions"])

# reports.pyのルーターを登録します
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])

api_router.include_router(students.router, prefix="/students", tags=["students"])

api_router.include_router(common.router, tags=["common"])