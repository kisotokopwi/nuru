from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class WorkerTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    site_id: int
    daily_rate: Decimal
    currency: str = "TZS"
    minimum_tasks_per_day: Optional[int] = None
    task_description: Optional[str] = None
    production_weight: Optional[Decimal] = None
    is_active: bool = True


class WorkerTypeCreate(WorkerTypeBase):
    pass


class WorkerTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    site_id: Optional[int] = None
    daily_rate: Optional[Decimal] = None
    currency: Optional[str] = None
    minimum_tasks_per_day: Optional[int] = None
    task_description: Optional[str] = None
    production_weight: Optional[Decimal] = None
    is_active: Optional[bool] = None


class WorkerType(WorkerTypeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True