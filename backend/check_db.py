from sqlmodel import Session, select
from app.database import engine
from app.models import User, FoodLog

def check_database():
    print("=" * 60)
    print("          SNIS DATABASE INSPECTOR")
    print("=" * 60)
    
    with Session(engine) as session:
        # Query Users
        users = session.exec(select(User)).all()
        print(f"\n[+] Registered User Profiles ({len(users)}):")
        print("-" * 60)
        if not users:
            print("No users found.")
        for user in users:
            print(f"ID: {user.id} | Username: {user.username} | Goal: {user.goal}")
            print(f"  Calorie Target: {user.target_calories} kcal | macros: P:{user.target_protein}g C:{user.target_carbs}g F:{user.target_fat}g")
            print("-" * 60)

        # Query Food Logs
        logs = session.exec(select(FoodLog)).all()
        print(f"\n[+] Food Log Entries ({len(logs)}):")
        print("-" * 60)
        if not logs:
            print("No food logs found in the database. Go add some meals in the dashboard!")
        for log in logs:
            print(f"ID: {log.id} | User ID: {log.user_id} | Food: {log.food_name} | Qty: {log.quantity} {log.unit}")
            print(f"  Calories: {log.calories} kcal | Macros: P:{log.protein}g C:{log.carbs}g F:{log.fat}g")
            print(f"  Logged at: {log.timestamp}")
            print("-" * 60)

if __name__ == "__main__":
    check_database()
