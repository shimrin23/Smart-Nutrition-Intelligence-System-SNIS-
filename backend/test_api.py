# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

def test_nutrition_system_flow():
    # Ensure tables are created before starting the test client
    print("[*] Initializing test database tables...")
    init_db()
    
    # Using 'with' triggers the FastAPI startup (lifespan) events properly
    with TestClient(app) as client:
        # 1. Create a test user via the legacy /users/ endpoint (auto-verified, no JWT needed)
        test_user_data = {
            "username": "test_athlete_99",
            "age": 30,
            "gender": "male",
            "weight_kg": 80.0,
            "height_cm": 180.0,
            "activity_level": "moderately_active",
            "goal": "lose_weight"
        }
        
        response = client.post("/users/", json=test_user_data)
        assert response.status_code == 201
        user = response.json()
        user_id = user["id"]
        
        assert user["username"] == "test_athlete_99"
        # BMR = (10 * 80) + (6.25 * 180) - (5 * 30) + 5 = 1780
        # TDEE = 1780 * 1.55 = 2759
        # Target Calories = 2759 - 500 = 2259
        assert user["target_calories"] == 2259
        assert user["target_protein"] == 160.0
        
        print(f"\n[+] Created Test User: {user['username']} (ID: {user_id})")
        print(f"    Target Calories: {user['target_calories']} kcal, Protein: {user['target_protein']}g")

        # 2. Get a JWT token by logging in
        # The legacy /users/ endpoint sets password=None so we need to use auth module directly
        # We'll generate a token manually for this test user
        from app.auth import create_access_token
        token = create_access_token(data={"sub": str(user_id)})
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 3. Get the created user (protected route)
        response = client.get(f"/users/{user_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["username"] == "test_athlete_99"

        # 4. Create a food log entry (protected route)
        test_meal_data = {
            "user_id": user_id,
            "food_name": "Grilled Chicken Breast with White Rice",
            "quantity": 1.0,
            "unit": "plate",
            "calories": 520.0,
            "protein": 42.0,
            "carbs": 50.0,
            "fat": 8.0,
            "fiber": 2.0,
            "iron": 1.5,
            "calcium": 20.0,
            "sodium": 350.0
        }
        
        response = client.post("/food-logs/", json=test_meal_data, headers=auth_headers)
        assert response.status_code == 201
        meal = response.json()
        assert meal["food_name"] == "Grilled Chicken Breast with White Rice"
        assert meal["user_id"] == user_id
        meal_log_id = meal["id"]
        print(f"[+] Created Food Log Entry (ID: {meal_log_id}): {meal['food_name']}")

        # 5. Check user logs summary (protected route)
        response = client.get(f"/food-logs/user/{user_id}/summary", headers=auth_headers)
        assert response.status_code == 200
        summaries = response.json()
        assert len(summaries) > 0
        today_str = summaries[-1]["date"]
        today_summary = [s for s in summaries if s["date"] == today_str][0]
        assert today_summary["total_calories"] == 520.0
        assert today_summary["total_protein"] == 42.0
        print(f"[+] Daily Summary verification passed for today ({today_str}).")

        # 6. Delete the user (protected route)
        response = client.delete(f"/users/{user_id}", headers=auth_headers)
        assert response.status_code == 204
        print(f"[+] Deleted Test User (ID: {user_id}).")

        # 7. Verify user is deleted
        response = client.get(f"/users/{user_id}", headers=auth_headers)
        assert response.status_code == 404
        
        # 8. Verify food log is also deleted (cascading check)
        response = client.get(f"/food-logs/{meal_log_id}", headers=auth_headers)
        assert response.status_code == 404
        print("[+] Cascading delete verification passed: Food log deleted successfully.")


def test_google_login_flow():
    from unittest.mock import patch
    from app.database import init_db
    
    init_db()
    
    with TestClient(app) as client:
        # Mock Google token verification response
        mock_id_info = {
            "email": "test_google_user@gmail.com",
            "name": "Google Tester"
        }
        
        # We patch the google_id_token verification module imported in users.py
        with patch("app.routers.users.google_id_token.verify_oauth2_token", return_value=mock_id_info):
            # 1. Perform Google login (registers new user since email does not exist)
            response = client.post("/users/google-login", json={"credential": "mock_token_123"})
            assert response.status_code == 200, f"Error: {response.text}"
            data = response.json()
            # Response now returns {"access_token": ..., "user": {...}}
            assert "access_token" in data
            user = data["user"]
            assert user["email"] == "test_google_user@gmail.com"
            assert user["username"] == "test_google_user"
            assert user["is_verified"] is True
            user_id = user["id"]
            token = data["access_token"]
            auth_headers = {"Authorization": f"Bearer {token}"}
            print(f"\n[+] Created Mock Google User (ID: {user_id})")

            # 2. Perform Google login again (retrieves the existing user)
            response = client.post("/users/google-login", json={"credential": "mock_token_123"})
            assert response.status_code == 200, f"Error: {response.text}"
            data_existing = response.json()
            assert "access_token" in data_existing
            assert data_existing["user"]["id"] == user_id
            print("[+] Successfully logged in existing Google user")

            # 3. Clean up test user (protected route)
            response = client.delete(f"/users/{user_id}", headers=auth_headers)
            assert response.status_code == 204
            print("[+] Cleaned up test Google user successfully")
