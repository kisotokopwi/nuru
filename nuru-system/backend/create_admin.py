#!/usr/bin/env python3

"""
Script to create a super admin user for the Nuru System
"""

import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the app directory to the Python path
sys.path.append(os.path.dirname(__file__))

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.db.base import Base

def create_super_admin():
    """Create a super admin user"""
    
    # Create database engine
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if super admin already exists
        existing_admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
        if existing_admin:
            print(f"Super admin already exists: {existing_admin.username}")
            return
        
        # Get user input
        print("Creating Super Admin User")
        print("-" * 30)
        
        username = input("Username: ").strip()
        if not username:
            print("Username cannot be empty!")
            return
            
        # Check if username already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"User with username '{username}' already exists!")
            return
        
        email = input("Email: ").strip()
        if not email:
            print("Email cannot be empty!")
            return
            
        # Check if email already exists
        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            print(f"User with email '{email}' already exists!")
            return
        
        full_name = input("Full Name: ").strip()
        if not full_name:
            print("Full name cannot be empty!")
            return
        
        phone_number = input("Phone Number (optional): ").strip() or None
        
        password = input("Password: ").strip()
        if not password:
            print("Password cannot be empty!")
            return
        
        if len(password) < 6:
            print("Password must be at least 6 characters long!")
            return
        
        # Create the user
        hashed_password = get_password_hash(password)
        
        admin_user = User(
            username=username,
            email=email,
            full_name=full_name,
            phone_number=phone_number,
            hashed_password=hashed_password,
            role=UserRole.SUPER_ADMIN,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"\n✅ Super admin user created successfully!")
        print(f"Username: {admin_user.username}")
        print(f"Email: {admin_user.email}")
        print(f"Role: {admin_user.role}")
        print(f"\nYou can now login to the system with these credentials.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating super admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_super_admin()