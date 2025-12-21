from fastapi import APIRouter

api_router = APIRouter()

# Import and include routers here as they are created
from app.api.sync import router as sync_router
from app.api.analytics import router as analytics_router

api_router.include_router(sync_router, tags=["sync"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])

# from app.api import users, tasks, expenses, sleep, mood, journals

# api_router.include_router(users.router, prefix="/users", tags=["users"])
# api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
# api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
# api_router.include_router(sleep.router, prefix="/sleep", tags=["sleep"])
# api_router.include_router(mood.router, prefix="/mood", tags=["mood"])
# api_router.include_router(journals.router, prefix="/journals", tags=["journals"])