from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from .client import Client


class ProjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    client_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    requires_production_tracking: bool = True
    production_unit: str = "tons"
    is_active: bool = True


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    requires_production_tracking: Optional[bool] = None
    production_unit: Optional[str] = None
    is_active: Optional[bool] = None


class Project(ProjectBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    client: Optional[Client] = None

    class Config:
        from_attributes = True