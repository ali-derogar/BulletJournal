from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from app.db.session import Base
import uuid

class ProfileTest(Base):
    __tablename__ = "profile_tests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Holland Career Interest Test (RIASEC)
    holland_scores = Column(JSON, nullable=True)  # {"R": 10, "I": 8, "A": 6, "S": 9, "E": 7, "C": 5}
    holland_dominant = Column(String, nullable=True)  # e.g., "RIS" (top 3 codes)
    
    # MBTI Personality Test
    mbti_type = Column(String, nullable=True)  # e.g., "INTJ"
    mbti_scores = Column(JSON, nullable=True)  # {"E": 45, "I": 55, "S": 40, "N": 60, "T": 65, "F": 35, "J": 70, "P": 30}
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SharedTestResult(Base):
    __tablename__ = "shared_test_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    test_type = Column(String, nullable=False)  # "holland" or "mbti"
    share_token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
