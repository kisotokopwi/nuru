#!/usr/bin/env python3

"""
Test script to verify the Nuru System setup
"""

import sys
import os
import requests
import time
from sqlalchemy import create_engine, text

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def test_database_connection():
    """Test database connection"""
    print("🔍 Testing database connection...")
    try:
        from app.core.config import settings
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            row = result.fetchone()
            if row and row[0] == 1:
                print("✅ Database connection successful")
                return True
            else:
                print("❌ Database connection failed")
                return False
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def test_backend_api():
    """Test backend API"""
    print("🔍 Testing backend API...")
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            print("✅ Backend API is running")
            return True
        else:
            print(f"❌ Backend API returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend API connection error: {e}")
        print("💡 Make sure the backend is running: uvicorn app.main:app --reload")
        return False

def test_frontend():
    """Test frontend"""
    print("🔍 Testing frontend...")
    try:
        response = requests.get("http://localhost:3000/", timeout=5)
        if response.status_code == 200:
            print("✅ Frontend is running")
            return True
        else:
            print(f"❌ Frontend returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Frontend connection error: {e}")
        print("💡 Make sure the frontend is running: npm start")
        return False

def test_api_endpoints():
    """Test key API endpoints"""
    print("🔍 Testing API endpoints...")
    
    endpoints = [
        "/health",
        "/api/v1/auth/login",  # Should return method not allowed for GET
    ]
    
    success_count = 0
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            if response.status_code in [200, 405]:  # 405 is OK for login endpoint
                print(f"✅ {endpoint} - OK")
                success_count += 1
            else:
                print(f"❌ {endpoint} - Status: {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")
    
    return success_count == len(endpoints)

def main():
    """Run all tests"""
    print("🧪 Nuru System Setup Test")
    print("=" * 40)
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Backend API", test_backend_api),
        ("Frontend", test_frontend),
        ("API Endpoints", test_api_endpoints),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 20)
        if test_func():
            passed += 1
        time.sleep(1)  # Small delay between tests
    
    print(f"\n📊 Test Results")
    print("=" * 40)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! The system is ready to use.")
        print("\n🚀 Next steps:")
        print("1. Create a super admin user: python backend/create_admin.py")
        print("2. Access the frontend at: http://localhost:3000")
        print("3. Login with your super admin credentials")
    else:
        print("⚠️  Some tests failed. Please check the setup.")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure PostgreSQL is running")
        print("2. Check database credentials in backend/.env")
        print("3. Start backend: cd backend && uvicorn app.main:app --reload")
        print("4. Start frontend: cd frontend && npm start")

if __name__ == "__main__":
    main()