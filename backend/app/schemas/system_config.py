from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SystemConfigBase(BaseModel):
    key: str
    value: str

class SystemConfigCreate(SystemConfigBase):
    pass

class SystemConfigUpdate(BaseModel):
    value: str

class SystemConfigResponse(SystemConfigBase):
    updated_at: datetime

    class Config:
        from_attributes = True
