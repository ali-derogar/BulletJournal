from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    id: str
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    created_at: datetime
    updatedAt: datetime
    deletedAt: datetime | None = None

    class Config:
        from_attributes = True