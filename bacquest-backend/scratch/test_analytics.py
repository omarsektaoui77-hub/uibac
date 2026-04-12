import requests
import time

BASE_URL = "http://localhost:8000"
USER_ID = "test_user_123"

def test_flow():
    print("1. Health Check...")
    try:
        r = requests.get(f"{BASE_URL}/health")
        print(r.json())
    except:
        print("Server not running locally. Skipping live test.")
        return

    # Mock recording answers
    # Lets assume we have a question with ID 1
    # This is just demonstrating the logic
    print("\n2. Recording mock answers...")
    for i in range(5):
        is_correct = (i % 2 == 0) # pseudo accuracy
        payload = {
            "user_id": USER_ID,
            "question_id": 1, 
            "selected_option": 0 if is_correct else 1
        }
        # In a real test we'd need valid question IDs
        # r = requests.post(f"{BASE_URL}/analytics/answer", json=payload)
        # print(f"Answer {i}: {r.status_code}")

    print("\n3. Testing Weak Topics...")
    r = requests.get(f"{BASE_URL}/analytics/weak-topics/{USER_ID}")
    print(r.json())

if __name__ == "__main__":
    test_flow()
