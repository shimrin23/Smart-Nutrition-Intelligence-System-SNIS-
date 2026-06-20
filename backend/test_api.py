from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

def test_nutrition_system_flow():
    # Ensure tables are created before starting the test client
    print("[*] Initializing test database tables...")
    init_db()
    
    # Using 'with' triggers the FastAPI startup (lifespan) events properly
    with TestClient(app) as client:
        # 1. Create a test user
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

        # 2. Get the created user
        response = client.get(f"/users/{user_id}")
        assert response.status_code == 200
        assert response.json()["username"] == "test_athlete_99"

        # 3. Create a food log entry
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
        
        response = client.post("/food-logs/", json=test_meal_data)
        assert response.status_code == 201
        meal = response.json()
        assert meal["food_name"] == "Grilled Chicken Breast with White Rice"
        assert meal["user_id"] == user_id
        meal_log_id = meal["id"]
        print(f"[+] Created Food Log Entry (ID: {meal_log_id}): {meal['food_name']}")

        # 4. Check user logs summary
        response = client.get(f"/food-logs/user/{user_id}/summary")
        assert response.status_code == 200
        summaries = response.json()
        assert len(summaries) > 0
        today_str = summaries[-1]["date"]
        today_summary = [s for s in summaries if s["date"] == today_str][0]
        assert today_summary["total_calories"] == 520.0
        assert today_summary["total_protein"] == 42.0
        print(f"[+] Daily Summary verification passed for today ({today_str}).")

        # 5. Delete the user
        response = client.delete(f"/users/{user_id}")
        assert response.status_code == 204
        print(f"[+] Deleted Test User (ID: {user_id}).")

        # 6. Verify user is deleted
        response = client.get(f"/users/{user_id}")
        assert response.status_code == 404
        
        # 7. Verify food log is also deleted (cascading check)
        response = client.get(f"/food-logs/{meal_log_id}")
        assert response.status_code == 404
        print("[+] Cascading delete verification passed: Food log deleted successfully.")
