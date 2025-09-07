from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.client import Client
from app.models.user import User
from app.models.audit_log import AuditAction
from app.schemas.client import Client as ClientSchema, ClientCreate, ClientUpdate
from app.api.deps import get_current_admin, log_audit_action

router = APIRouter()


@router.get("/", response_model=List[ClientSchema])
def read_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True
) -> Any:
    """
    Retrieve clients. Only admins can view clients.
    """
    query = db.query(Client)
    if active_only:
        query = query.filter(Client.is_active == True)
    
    clients = query.offset(skip).limit(limit).all()
    return clients


@router.post("/", response_model=ClientSchema)
def create_client(
    *,
    db: Session = Depends(get_db),
    client_in: ClientCreate,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Create new client. Only admins can create clients.
    """
    # Check if client code already exists
    existing_client = db.query(Client).filter(Client.code == client_in.code).first()
    if existing_client:
        raise HTTPException(
            status_code=400,
            detail="Client code already exists"
        )
    
    client = Client(**client_in.dict())
    db.add(client)
    db.commit()
    db.refresh(client)
    
    # Log client creation
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.CREATE,
        table_name="clients",
        record_id=client.id,
        new_values={
            "name": client.name,
            "code": client.code,
            "contact_person": client.contact_person,
            "email": client.email
        },
        description=f"Created new client: {client.name} ({client.code})"
    )
    
    return client


@router.get("/{client_id}", response_model=ClientSchema)
def read_client(
    *,
    db: Session = Depends(get_db),
    client_id: int,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Get client by ID.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return client


@router.put("/{client_id}", response_model=ClientSchema)
def update_client(
    *,
    db: Session = Depends(get_db),
    client_id: int,
    client_in: ClientUpdate,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Update a client.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Store old values for audit
    old_values = {
        "name": client.name,
        "code": client.code,
        "contact_person": client.contact_person,
        "email": client.email,
        "phone_number": client.phone_number,
        "address": client.address,
        "invoice_template": client.invoice_template,
        "is_active": client.is_active
    }
    
    # Check if new code conflicts with existing client
    update_data = client_in.dict(exclude_unset=True)
    if "code" in update_data and update_data["code"] != client.code:
        existing_client = db.query(Client).filter(Client.code == update_data["code"]).first()
        if existing_client:
            raise HTTPException(
                status_code=400,
                detail="Client code already exists"
            )
    
    # Update client fields
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    
    # Log the update
    new_values = {
        "name": client.name,
        "code": client.code,
        "contact_person": client.contact_person,
        "email": client.email,
        "phone_number": client.phone_number,
        "address": client.address,
        "invoice_template": client.invoice_template,
        "is_active": client.is_active
    }
    
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        table_name="clients",
        record_id=client.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated client: {client.name} ({client.code})"
    )
    
    return client


@router.delete("/{client_id}")
def delete_client(
    *,
    db: Session = Depends(get_db),
    client_id: int,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Delete a client (soft delete by setting is_active to False).
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if client has active projects
    if client.projects:
        active_projects = [p for p in client.projects if p.is_active]
        if active_projects:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete client with active projects. Deactivate projects first."
            )
    
    # Store client data for audit log
    client_data = {
        "name": client.name,
        "code": client.code,
        "contact_person": client.contact_person,
        "email": client.email
    }
    
    # Soft delete
    client.is_active = False
    db.commit()
    
    # Log the deletion
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.DELETE,
        table_name="clients",
        record_id=client_id,
        old_values=client_data,
        description=f"Deactivated client: {client_data['name']} ({client_data['code']})"
    )
    
    return {"message": "Client deactivated successfully"}