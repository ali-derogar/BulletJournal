from sqlalchemy import Column, String, DateTime, Text, func
from app.db.session import Base

class SystemConfig(Base):
    __tablename__ = "system_configs"

    key = Column(String(50), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
