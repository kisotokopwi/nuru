from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Numeric, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base


class InvoiceType(str, enum.Enum):
    CLIENT = "client"  # Invoice sent to client (limited information)
    NURU = "nuru"      # Internal Nuru invoice (detailed information)


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    
    # Invoice identification
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    invoice_type = Column(Enum(InvoiceType), nullable=False)
    
    # Related records
    daily_record_id = Column(Integer, ForeignKey("daily_records.id"), nullable=False)
    
    # Invoice details
    invoice_date = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True), nullable=True)
    
    # Financial information
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0)  # Percentage
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    
    # Status and tracking
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT)
    
    # PDF generation
    pdf_file_path = Column(String(500), nullable=True)
    pdf_generated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Client information (for easy access without joins)
    client_name = Column(String(100), nullable=True)
    client_address = Column(Text, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    daily_record = relationship("DailyRecord", back_populates="invoices")
    invoice_items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Invoice(number={self.invoice_number}, type={self.invoice_type})>"


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    
    # Parent invoice
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    
    # Item details
    description = Column(String(200), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(12, 2), nullable=False)
    
    # Additional details for Nuru invoices
    worker_names = Column(Text, nullable=True)  # Comma-separated names for detailed invoices
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    invoice = relationship("Invoice", back_populates="invoice_items")

    def __repr__(self):
        return f"<InvoiceItem(description={self.description}, quantity={self.quantity})>"