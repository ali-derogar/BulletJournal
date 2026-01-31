from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ExpenseBase(BaseModel):
    id: str
    userId: str
    date: str
    title: str
    amount: float
    type: str = "expense"

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[str] = None

class Expense(ExpenseBase):
    createdAt: Optional[datetime] = Field(None, alias="created_at")
    created_at: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True