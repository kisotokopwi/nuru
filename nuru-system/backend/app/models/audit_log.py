from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    CORRECTION = "correction"
    INVOICE_GENERATE = "invoice_generate"
    EXPORT = "export"
    PRINT = "print"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # User and action information
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for system actions
    action = Column(Enum(AuditAction), nullable=False, index=True)
    
    # Target information
    table_name = Column(String(50), nullable=True)  # Which table was affected
    record_id = Column(Integer, nullable=True)  # Which record was affected
    
    # Change details
    old_values = Column(JSON, nullable=True)  # Previous values (for updates)
    new_values = Column(JSON, nullable=True)  # New values (for creates/updates)
    
    # Context information
    description = Column(Text, nullable=True)  # Human-readable description
    ip_address = Column(String(45), nullable=True)  # User's IP address
    user_agent = Column(String(500), nullable=True)  # Browser/app information
    
    # Additional metadata
    metadata = Column(JSON, nullable=True)  # Additional context data
    
    # Correction-specific fields
    correction_reason = Column(String(200), nullable=True)  # Reason for same-day correction
    correction_count = Column(Integer, nullable=True)  # Which correction number this was
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog(action={self.action}, table={self.table_name}, user_id={self.user_id})>"