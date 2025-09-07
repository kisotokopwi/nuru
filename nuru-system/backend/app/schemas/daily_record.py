from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal


class DailyRecordItemBase(BaseModel):
    worker_type_id: int
    worker_count: int
    total_payment: Decimal
    payment_per_worker: Decimal
    worker_names: Optional[List[str]] = None
    productivity_score: Optional[Decimal] = None
    attendance_notes: Optional[str] = None


class DailyRecordItemCreate(DailyRecordItemBase):
    pass


class DailyRecordItem(DailyRecordItemBase):
    id: int
    daily_record_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DailyRecordBase(BaseModel):
    record_date: date
    site_id: int
    total_production: Optional[Decimal] = None
    production_unit: str = "tons"
    tasks_completed: Optional[int] = None
    task_completion_notes: Optional[str] = None
    weather_conditions: Optional[str] = None
    site_conditions_notes: Optional[str] = None
    supervisor_notes: Optional[str] = None


class DailyRecordCreate(DailyRecordBase):
    record_items: List[DailyRecordItemCreate]


class DailyRecordUpdate(BaseModel):
    total_production: Optional[Decimal] = None
    production_unit: Optional[str] = None
    tasks_completed: Optional[int] = None
    task_completion_notes: Optional[str] = None
    weather_conditions: Optional[str] = None
    site_conditions_notes: Optional[str] = None
    supervisor_notes: Optional[str] = None
    correction_reason: Optional[str] = None  # Required for same-day corrections
    record_items: Optional[List[DailyRecordItemCreate]] = None


class DailyRecord(DailyRecordBase):
    id: int
    supervisor_id: int
    is_locked: bool = False
    correction_count: int = 0
    last_correction_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    locked_at: Optional[datetime] = None
    record_items: List[DailyRecordItem] = []

    class Config:
        from_attributes = True