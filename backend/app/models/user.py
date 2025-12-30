from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, nullable=False, index=True)  # For consistency, though may be same as id
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deletedAt = Column(DateTime(timezone=True), nullable=True)

    # Profile fields
    username = Column(String, unique=True, index=True, nullable=True) # Nullable for now for migration safety
    avatar_url = Column(Text, nullable=True)
    education_level = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    general_goal = Column(Text, nullable=True)  # Using Text for potentially longer content
    income_level = Column(String, nullable=True)
    mbti_type = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)  # JSON or comma-separated string
    location = Column(String, nullable=True)