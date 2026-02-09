from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
import logging

from app.api.main import api_router
from app.auth.router import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.content import router as content_router
from app.routers.notifications import router as notifications_router
from app.routers.chatroom import router as chatroom_router
from app.db.session import engine, is_sqlite
from app.db.session import Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Note: Database migrations are run automatically by Dockerfile CMD
# See backend/Dockerfile line 38: "alembic upgrade head && uvicorn main:app ..."

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Bullet Journal API",
    description="Backend API for Bullet Journal PWA",
    version="1.0.0",
    docs_url="/docs" if not is_sqlite else "/docs",  # Can disable in production
    redoc_url="/redoc" if not is_sqlite else "/redoc",
)

# CORS middleware - MUST be first middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# GZip compression for responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Security: Trusted host middleware (uncomment in production)
# app.add_middleware(
#     TrustedHostMiddleware,
#     allowed_hosts=["localhost", "127.0.0.1", "yourdomain.com"]
# )

# Request timing middleware for monitoring
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    # Log slow requests
    if process_time > 1.0:
        logger.warning(
            f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s"
        )

    return response

# Security headers middleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Include routers
app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(admin_router, prefix="/api") # /api/admin
app.include_router(content_router, prefix="/api") # /api/admin/content
app.include_router(notifications_router, prefix="/api") # Notifications
app.include_router(chatroom_router, prefix="/api") # Chatroom

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    try:
        # Import all models to ensure they are registered in Base.metadata
        from app.models import User, Task, DailyJournal, Goal, Report, Expense, SleepInfo, MoodInfo, Reflection, SystemConfig, Notification, CalendarNote
        from app.db.session import engine, Base
        
        # Create all tables if they don't exist
        # create_all is idempotent - it won't delete existing tables
        Base.metadata.create_all(bind=engine)
        logger.info("✓ Database tables verified/created successfully!")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")

@app.get("/api/health")
@app.get("/health")
@limiter.limit("10/minute")  # Rate limit health checks
async def health_check(request: Request):
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "bullet-journal-api",
        "database": "sqlite" if is_sqlite else "postgresql",
    }

@app.get("/backup")
@limiter.limit("1/hour")  # Strict rate limit for backups
async def trigger_backup(request: Request):
    """Trigger manual database backup (SQLite only)"""
    if not is_sqlite:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Backup only supported for SQLite"}
        )

    try:
        from app.db.backup import backup_sqlite, verify_backup

        backup_file = backup_sqlite()
        is_valid = verify_backup(backup_file)

        return {
            "status": "success",
            "backup_file": backup_file,
            "verified": is_valid
        }
    except Exception as e:
        logger.error(f"Backup failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(e)}
        )
