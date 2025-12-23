from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.sql import func
from app.db.session import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, name='user_id', nullable=False, index=True)
    date = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deletedAt = Column(DateTime(timezone=True), nullable=True)