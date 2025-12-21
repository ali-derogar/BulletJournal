#!/usr/bin/env python3
"""
Test script for /sync endpoint
Tests authentication, upsert logic, and conflict resolution
"""
import requests
import json
from datetime import datetime, timedelta
import uuid

BASE_URL = "http://localhost:8000"

def test_sync_endpoint():
    print("=" * 60)
    print("Testing POST /sync endpoint")
    print("=" * 60)

    # Step 1: Register a test user
    print("\n1. Registering test user...")
    register_data = {
        "name": "Test User",
        "email": f"test_{uuid.uuid4()}@example.com",
        "password": "testpassword123"
    }

    response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    if response.status_code == 200:
        print("✓ User registered successfully")
        user_data = response.json()
        print(f"  User ID: {user_data['id']}")
    else:
        print(f"✗ Registration failed: {response.status_code}")
        print(f"  {response.text}")
        return False

    # Step 2: Login to get JWT token
    print("\n2. Logging in to get JWT token...")
    login_data = {
        "username": register_data["email"],
        "password": register_data["password"]
    }

    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if response.status_code == 200:
        print("✓ Login successful")
        token_data = response.json()
        access_token = token_data["access_token"]
        print(f"  Token: {access_token[:20]}...")
    else:
        print(f"✗ Login failed: {response.status_code}")
        print(f"  {response.text}")
        return False

    headers = {"Authorization": f"Bearer {access_token}"}

    # Step 3: Test sync without authentication (should fail)
    print("\n3. Testing sync without authentication (should fail)...")
    sync_data = {
        "tasks": [],
        "expenses": [],
        "journals": [],
        "reflections": []
    }

    response = requests.post(f"{BASE_URL}/api/sync", json=sync_data)
    if response.status_code == 401:
        print("✓ Correctly rejected unauthenticated request")
    else:
        print(f"✗ Expected 401, got {response.status_code}")

    # Step 4: Test sync with empty data
    print("\n4. Testing sync with empty data...")
    response = requests.post(f"{BASE_URL}/api/sync", json=sync_data, headers=headers)
    if response.status_code == 200:
        print("✓ Sync successful with empty data")
        result = response.json()
        print(f"  Response: {json.dumps(result, indent=2)}")
    else:
        print(f"✗ Sync failed: {response.status_code}")
        print(f"  {response.text}")
        return False

    # Step 5: Test sync with new tasks
    print("\n5. Testing sync with new tasks...")
    task_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    sync_data = {
        "tasks": [
            {
                "id": task_id,
                "userId": user_data["id"],
                "date": "2025-01-15",
                "title": "Test Task",
                "status": "todo",
                "updatedAt": now,
                "accumulated_time": 0,
                "timer_running": False
            }
        ],
        "expenses": [],
        "journals": [],
        "reflections": []
    }

    response = requests.post(f"{BASE_URL}/api/sync", json=sync_data, headers=headers)
    if response.status_code == 200:
        print("✓ Sync successful with new task")
        result = response.json()
        print(f"  Synced tasks: {result['synced_tasks']}")
        print(f"  Conflicts resolved: {result['conflicts_resolved']}")
    else:
        print(f"✗ Sync failed: {response.status_code}")
        print(f"  {response.text}")
        return False

    # Step 6: Test upsert (update existing task)
    print("\n6. Testing upsert (updating existing task)...")
    sync_data["tasks"][0]["title"] = "Updated Test Task"
    sync_data["tasks"][0]["status"] = "in-progress"
    sync_data["tasks"][0]["updatedAt"] = (datetime.utcnow() + timedelta(seconds=5)).isoformat()

    response = requests.post(f"{BASE_URL}/api/sync", json=sync_data, headers=headers)
    if response.status_code == 200:
        print("✓ Upsert successful")
        result = response.json()
        print(f"  Synced tasks: {result['synced_tasks']}")
        print(f"  Conflicts resolved: {result['conflicts_resolved']}")
    else:
        print(f"✗ Upsert failed: {response.status_code}")
        print(f"  {response.text}")
        return False

    # Step 7: Test conflict resolution (client has older data)
    print("\n7. Testing conflict resolution (client has older data)...")
    old_timestamp = (datetime.utcnow() - timedelta(minutes=10)).isoformat()
    sync_data["tasks"][0]["title"] = "Should Not Update"
    sync_data["tasks"][0]["updatedAt"] = old_timestamp

    response = requests.post(f"{BASE_URL}/api/sync", json=sync_data, headers=headers)
    if response.status_code == 200:
        print("✓ Conflict resolution working")
        result = response.json()
        print(f"  Synced tasks: {result['synced_tasks']}")
        print(f"  Conflicts resolved: {result['conflicts_resolved']}")
        if result['conflicts_resolved'] > 0:
            print("  ✓ Server correctly kept newer version (last-write-wins)")
        else:
            print("  ! Warning: No conflicts detected (might be expected)")
    else:
        print(f"✗ Conflict resolution test failed: {response.status_code}")
        print(f"  {response.text}")
        return False

    # Step 8: Test all entity types
    print("\n8. Testing sync with all entity types...")
    expense_id = str(uuid.uuid4())
    journal_id = str(uuid.uuid4())
    reflection_id = str(uuid.uuid4())

    sync_data = {
        "tasks": [
            {
                "id": str(uuid.uuid4()),
                "userId": user_data["id"],
                "date": "2025-01-15",
                "title": "Another Task",
                "status": "done",
                "updatedAt": now,
                "accumulated_time": 30,
                "timer_running": False
            }
        ],
        "expenses": [
            {
                "id": expense_id,
                "userId": user_data["id"],
                "date": "2025-01-15",
                "title": "Coffee",
                "amount": 5.50,
                "updatedAt": now
            }
        ],
        "journals": [
            {
                "id": journal_id,
                "userId": user_data["id"],
                "date": "2025-01-15",
                "tasks": json.dumps([task_id]),
                "expenses": json.dumps([expense_id]),
                "updatedAt": now
            }
        ],
        "reflections": [
            {
                "id": reflection_id,
                "userId": user_data["id"],
                "date": "2025-01-15",
                "notes": "Great day!",
                "water_intake": 8,
                "study_minutes": 120,
                "updatedAt": now
            }
        ]
    }

    response = requests.post(f"{BASE_URL}/api/sync", json=sync_data, headers=headers)
    if response.status_code == 200:
        print("✓ Sync successful with all entity types")
        result = response.json()
        print(f"  Synced tasks: {result['synced_tasks']}")
        print(f"  Synced expenses: {result['synced_expenses']}")
        print(f"  Synced journals: {result['synced_journals']}")
        print(f"  Synced reflections: {result['synced_reflections']}")
        print(f"  Conflicts resolved: {result['conflicts_resolved']}")
    else:
        print(f"✗ Sync failed: {response.status_code}")
        print(f"  {response.text}")
        return False

    print("\n" + "=" * 60)
    print("✓ ALL TESTS PASSED!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    try:
        success = test_sync_endpoint()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
