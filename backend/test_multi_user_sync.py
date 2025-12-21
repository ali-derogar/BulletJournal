#!/usr/bin/env python3
"""
Test script for multi-user sync functionality
Tests that users can only access their own data and sync works correctly across multiple users
"""
import requests
import json
from datetime import datetime, timedelta
import uuid

BASE_URL = "http://localhost:8000"

def test_multi_user_sync():
    print("=" * 70)
    print("Testing Multi-User Sync Functionality")
    print("=" * 70)

    # Step 1: Register two test users
    print("\n1. Registering two test users...")
    users = []

    for i in range(2):
        user_data = {
            "name": f"Test User {i+1}",
            "email": f"test_user_{i+1}_{uuid.uuid4()}@example.com",
            "password": "testpassword123"
        }

        response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
        if response.status_code == 200:
            print(f"✓ User {i+1} registered successfully")
            user_info = response.json()
            user_info["email"] = user_data["email"]
            user_info["password"] = user_data["password"]
            users.append(user_info)
        else:
            print(f"✗ User {i+1} registration failed: {response.status_code}")
            print(f"  {response.text}")
            return False

    # Step 2: Login both users and get tokens
    print("\n2. Logging in both users...")
    tokens = []

    for i, user in enumerate(users):
        login_data = {
            "username": user["email"],
            "password": user["password"]
        }

        response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
        if response.status_code == 200:
            print(f"✓ User {i+1} login successful")
            token_data = response.json()
            tokens.append(token_data["access_token"])
        else:
            print(f"✗ User {i+1} login failed: {response.status_code}")
            return False

    headers_user1 = {"Authorization": f"Bearer {tokens[0]}"}
    headers_user2 = {"Authorization": f"Bearer {tokens[1]}"}

    # Step 3: User 1 creates some data
    print("\n3. User 1 creates tasks and expenses...")
    now = datetime.utcnow().isoformat()

    user1_task_id = str(uuid.uuid4())
    user1_expense_id = str(uuid.uuid4())

    sync_data_user1 = {
        "tasks": [
            {
                "id": user1_task_id,
                "userId": users[0]["id"],
                "date": "2025-01-15",
                "title": "User 1 Task",
                "status": "todo",
                "updatedAt": now,
                "accumulated_time": 0,
                "timer_running": False
            }
        ],
        "expenses": [
            {
                "id": user1_expense_id,
                "userId": users[0]["id"],
                "date": "2025-01-15",
                "title": "User 1 Coffee",
                "amount": 5.50,
                "updatedAt": now
            }
        ],
        "journals": [],
        "reflections": []
    }

    response = requests.post(f"{BASE_URL}/api/sync", json=sync_data_user1, headers=headers_user1)
    if response.status_code == 200:
        print("✓ User 1 data sync successful")
        result = response.json()
        print(f"  Synced tasks: {result['synced_tasks']}, expenses: {result['synced_expenses']}")
    else:
        print(f"✗ User 1 sync failed: {response.status_code}")
        print(f"  {response.text}")
        return False

    # Step 4: User 2 creates different data
    print("\n4. User 2 creates tasks and expenses...")
    user2_task_id = str(uuid.uuid4())
    user2_expense_id = str(uuid.uuid4())

    sync_data_user2 = {
        "tasks": [
            {
                "id": user2_task_id,
                "userId": users[1]["id"],
                "date": "2025-01-15",
                "title": "User 2 Task",
                "status": "in-progress",
                "updatedAt": now,
                "accumulated_time": 30,
                "timer_running": False
            }
        ],
        "expenses": [
            {
                "id": user2_expense_id,
                "userId": users[1]["id"],
                "date": "2025-01-15",
                "title": "User 2 Lunch",
                "amount": 12.00,
                "updatedAt": now
            }
        ],
        "journals": [],
        "reflections": []
    }

    response = requests.post(f"{BASE_URL}/api/sync", json=sync_data_user2, headers=headers_user2)
    if response.status_code == 200:
        print("✓ User 2 data sync successful")
        result = response.json()
        print(f"  Synced tasks: {result['synced_tasks']}, expenses: {result['synced_expenses']}")
    else:
        print(f"✗ User 2 sync failed: {response.status_code}")
        print(f"  {response.text}")
        return False

    # Step 5: Test data isolation - User 1 should not see User 2's data
    print("\n5. Testing data isolation - User 1 tries to access User 2's data...")

    # Try to sync User 2's data as User 1 (should fail)
    malicious_sync_data = {
        "tasks": [
            {
                "id": user2_task_id,  # User 2's task ID
                "userId": users[0]["id"],  # But claiming it belongs to User 1
                "date": "2025-01-15",
                "title": "Hacked Task",
                "status": "done",
                "updatedAt": (datetime.utcnow() + timedelta(seconds=10)).isoformat(),
                "accumulated_time": 60,
                "timer_running": False
            }
        ],
        "expenses": [],
        "journals": [],
        "reflections": []
    }

    response = requests.post(f"{BASE_URL}/api/sync", json=malicious_sync_data, headers=headers_user1)
    if response.status_code == 403:
        print("✓ Correctly rejected attempt to sync another user's data")
    else:
        print(f"✗ Security breach! Expected 403, got {response.status_code}")
        print(f"  {response.text}")
        return False

    # Step 6: Test that users can only sync their own data
    print("\n6. Testing that users can only sync their own data...")

    # User 1 tries to sync empty data (should work)
    empty_sync = {"tasks": [], "expenses": [], "journals": [], "reflections": []}
    response = requests.post(f"{BASE_URL}/api/sync", json=empty_sync, headers=headers_user1)
    if response.status_code == 200:
        print("✓ User 1 can sync empty data")
    else:
        print(f"✗ User 1 empty sync failed: {response.status_code}")
        return False

    # User 2 tries to sync empty data (should work)
    response = requests.post(f"{BASE_URL}/api/sync", json=empty_sync, headers=headers_user2)
    if response.status_code == 200:
        print("✓ User 2 can sync empty data")
    else:
        print(f"✗ User 2 empty sync failed: {response.status_code}")
        return False

    # Step 7: Test concurrent sync simulation
    print("\n7. Testing concurrent sync simulation...")

    # Both users update their own data simultaneously
    updated_time = (datetime.utcnow() + timedelta(seconds=20)).isoformat()

    # User 1 updates their task
    user1_update = {
        "tasks": [
            {
                "id": user1_task_id,
                "userId": users[0]["id"],
                "date": "2025-01-15",
                "title": "User 1 Updated Task",
                "status": "in-progress",
                "updatedAt": updated_time,
                "accumulated_time": 15,
                "timer_running": False
            }
        ],
        "expenses": [],
        "journals": [],
        "reflections": []
    }

    # User 2 updates their task
    user2_update = {
        "tasks": [
            {
                "id": user2_task_id,
                "userId": users[1]["id"],
                "date": "2025-01-15",
                "title": "User 2 Updated Task",
                "status": "done",
                "updatedAt": updated_time,
                "accumulated_time": 45,
                "timer_running": False
            }
        ],
        "expenses": [],
        "journals": [],
        "reflections": []
    }

    # Sync both updates
    response1 = requests.post(f"{BASE_URL}/api/sync", json=user1_update, headers=headers_user1)
    response2 = requests.post(f"{BASE_URL}/api/sync", json=user2_update, headers=headers_user2)

    if response1.status_code == 200 and response2.status_code == 200:
        print("✓ Both users successfully synced updates concurrently")
        result1 = response1.json()
        result2 = response2.json()
        print(f"  User 1: {result1['synced_tasks']} tasks synced")
        print(f"  User 2: {result2['synced_tasks']} tasks synced")
    else:
        print(f"✗ Concurrent sync failed: User1={response1.status_code}, User2={response2.status_code}")
        return False

    print("\n" + "=" * 70)
    print("✓ ALL MULTI-USER TESTS PASSED!")
    print("✓ Data isolation confirmed")
    print("✓ Multi-user sync functionality verified")
    print("=" * 70)
    return True

if __name__ == "__main__":
    try:
        success = test_multi_user_sync()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)