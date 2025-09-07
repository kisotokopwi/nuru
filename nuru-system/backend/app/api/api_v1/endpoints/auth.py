from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_password_hash
from app.db.base import get_db
from app.models.user import User
from app.models.audit_log import AuditAction
from app.schemas.auth import Token, Login
from app.schemas.user import User as UserSchema, UserCreate
from app.api.deps import get_current_active_user, log_audit_action

router = APIRouter()


@router.post("/login", response_model=Token)
def login_for_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        # Log failed login attempt
        if user:
            log_audit_action(
                db=db,
                user=user,
                action=AuditAction.LOGIN,
                description=f"Failed login attempt for user {form_data.username}",
                metadata={"success": False, "reason": "invalid_credentials"}
            )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username, expires_delta=access_token_expires
    )
    
    # Log successful login
    log_audit_action(
        db=db,
        user=user,
        action=AuditAction.LOGIN,
        description=f"Successful login for user {user.username}",
        metadata={"success": True, "role": user.role.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/register", response_model=UserSchema)
def register_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create new user. Only admins can create users.
    """
    # Check if current user is admin
    from app.models.user import UserRole
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to create users"
        )
    
    # Check if user already exists
    user = db.query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_in.password)
    user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        phone_number=user_in.phone_number,
        hashed_password=hashed_password,
        role=user_in.role,
        is_active=user_in.is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Log user creation
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.CREATE,
        table_name="users",
        record_id=user.id,
        new_values={
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value
        },
        description=f"Created new user: {user.username}"
    )
    
    return user


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Logout current user (mainly for audit logging)
    """
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.LOGOUT,
        description=f"User {current_user.username} logged out"
    )
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserSchema)
def read_users_me(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get current user information
    """
    return current_user