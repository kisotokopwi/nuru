from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.core.config import settings
from app.core.security import verify_token
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog, AuditAction


security = HTTPBearer()


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Get current authenticated user from JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        username = verify_token(credentials.credentials)
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_super_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Require Super Admin role
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Super Admin role required."
        )
    return current_user


def get_current_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Require Admin role (Super Admin or Site Admin)
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin role required."
        )
    return current_user


def get_current_supervisor(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Require Supervisor role or higher
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN, UserRole.SUPERVISOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Supervisor role required."
        )
    return current_user


def log_audit_action(
    db: Session,
    user: User,
    action: AuditAction,
    table_name: Optional[str] = None,
    record_id: Optional[int] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    description: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[dict] = None,
    correction_reason: Optional[str] = None,
    correction_count: Optional[int] = None
):
    """
    Log an audit action to the database
    """
    audit_log = AuditLog(
        user_id=user.id if user else None,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=old_values,
        new_values=new_values,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata,
        correction_reason=correction_reason,
        correction_count=correction_count
    )
    db.add(audit_log)
    db.commit()
    return audit_log