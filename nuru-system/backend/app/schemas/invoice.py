from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from app.models.invoice import InvoiceType, InvoiceStatus


class InvoiceItemBase(BaseModel):
    description: str
    quantity: Decimal
    unit_price: Decimal
    total_price: Decimal
    worker_names: Optional[str] = None


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItem(InvoiceItemBase):
    id: int
    invoice_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    invoice_type: InvoiceType
    daily_record_id: int
    due_date: Optional[datetime] = None
    subtotal: Decimal = Decimal('0.00')
    tax_amount: Decimal = Decimal('0.00')
    tax_rate: Decimal = Decimal('0.00')
    total_amount: Decimal = Decimal('0.00')
    status: InvoiceStatus = InvoiceStatus.DRAFT
    client_name: Optional[str] = None
    client_address: Optional[str] = None
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    invoice_items: List[InvoiceItemCreate] = []


class Invoice(InvoiceBase):
    id: int
    invoice_number: str
    invoice_date: datetime
    pdf_file_path: Optional[str] = None
    pdf_generated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    invoice_items: List[InvoiceItem] = []

    class Config:
        from_attributes = True