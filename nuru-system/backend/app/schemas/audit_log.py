from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from app.models.audit_log import AuditAction


class AuditLog(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: AuditAction
    table_name: Optional[str] = None
    record_id: Optional[int] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    correction_reason: Optional[str] = None
    correction_count: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True