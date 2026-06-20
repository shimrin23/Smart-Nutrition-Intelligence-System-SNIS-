import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# Baseline foods for clustering (per 100g)
FOOD_DATASET = [
    {"food_name": "Chicken Breast", "protein": 31.0, "carbs": 0.0, "fat": 3.6},
    {"food_name": "Canned Tuna", "protein": 26.0, "carbs": 0.0, "fat": 1.0},
    {"food_name": "Egg Whites", "protein": 11.0, "carbs": 0.7, "fat": 0.2},
    {"food_name": "Greek Yogurt (Nonfat)", "protein": 10.0, "carbs": 3.6, "fat": 0.4},
    {"food_name": "White Rice (Cooked)", "protein": 2.7, "carbs": 28.0, "fat": 0.3},
    {"food_name": "Oatmeal (Cooked)", "protein": 2.5, "carbs": 12.0, "fat": 1.4},
    {"food_name": "Sweet Potato (Baked)", "protein": 2.0, "carbs": 21.0, "fat": 0.1},
    {"food_name": "Banana", "protein": 1.1, "carbs": 22.8, "fat": 0.3},
    {"food_name": "Apple", "protein": 0.3, "carbs": 13.8, "fat": 0.2},
    {"food_name": "Almonds", "protein": 21.0, "carbs": 21.0, "fat": 49.0},
    {"food_name": "Peanut Butter", "protein": 25.0, "carbs": 20.0, "fat": 50.0},
    {"food_name": "Olive Oil", "protein": 0.0, "carbs": 0.0, "fat": 100.0},
    {"food_name": "Avocado", "protein": 2.0, "carbs": 8.5, "fat": 14.7},
    {"food_name": "Whole Egg", "protein": 13.0, "carbs": 1.1, "fat": 11.0},
    {"food_name": "Salmon Fillet", "protein": 20.0, "carbs": 0.0, "fat": 13.0},
    {"food_name": "Whole Milk", "protein": 3.2, "carbs": 4.8, "fat": 3.2},
    {"food_name": "Lean Beef", "protein": 26.0, "carbs": 0.0, "fat": 15.0},
    {"food_name": "Broccoli", "protein": 2.8, "carbs": 7.0, "fat": 0.4},
    {"food_name": "Spinach", "protein": 2.9, "carbs": 3.6, "fat": 0.4},
    {"food_name": "Quinoa (Cooked)", "protein": 4.4, "carbs": 21.3, "fat": 1.9},
]

def get_cluster_label(cluster_id: int, cluster_means: dict) -> str:
    # Match the cluster to a descriptive label based on its highest mean macronutrient percentage
    means = cluster_means[cluster_id]
    max_macro = max(means, key=means.get)
    
    labels = {
        "pct_protein": "Lean Protein Source",
        "pct_carbs": "Energy Carbs Source",
        "pct_fat": "Healthy Fats Source"
    }
    return labels.get(max_macro, "Balanced Nutrition")

def train_kmeans_recommender():
    df = pd.DataFrame(FOOD_DATASET)
    
    # Calculate calories contributed by each macro
    # Protein = 4 kcal/g, Carbs = 4 kcal/g, Fat = 9 kcal/g
    df["prot_kcal"] = df["protein"] * 4
    df["carb_kcal"] = df["carbs"] * 4
    df["fat_kcal"] = df["fat"] * 9
    df["total_kcal"] = df["prot_kcal"] + df["carb_kcal"] + df["fat_kcal"]
    df["total_kcal"] = df["total_kcal"].replace(0, 1)  # avoid division by zero
    
    # Ratios
    df["pct_protein"] = df["prot_kcal"] / df["total_kcal"]
    df["pct_carbs"] = df["carb_kcal"] / df["total_kcal"]
    df["pct_fat"] = df["fat_kcal"] / df["total_kcal"]
    
    features = ["pct_protein", "pct_carbs", "pct_fat"]
    X = df[features].values
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(X_scaled)
    
    # Calculate centroids and translate them to label categories
    cluster_means = {}
    for cid in range(4):
        subset = df[df["cluster"] == cid]
        cluster_means[cid] = {
            "pct_protein": float(subset["pct_protein"].mean()),
            "pct_carbs": float(subset["pct_carbs"].mean()),
            "pct_fat": float(subset["pct_fat"].mean())
        }
        
    return df, kmeans, scaler, cluster_means

def get_food_recommendations(prot_deficit: float, carb_deficit: float, fat_deficit: float) -> list:
    df, kmeans, scaler, cluster_means = train_kmeans_recommender()
    
    total_deficit_kcal = (max(0, prot_deficit) * 4) + (max(0, carb_deficit) * 4) + (max(0, fat_deficit) * 9)
    if total_deficit_kcal <= 0:
        # Balanced recommendations when targets are already reached
        balanced_foods = [
            {"food_name": "Broccoli", "protein": 2.8, "carbs": 7.0, "fat": 0.4, "category": "Micronutrients / Veggies"},
            {"food_name": "Spinach", "protein": 2.9, "carbs": 3.6, "fat": 0.4, "category": "Micronutrients / Veggies"},
            {"food_name": "Apple", "protein": 0.3, "carbs": 13.8, "fat": 0.2, "category": "Healthy Fruit Snacking"}
        ]
        return balanced_foods
        
    pct_p = (max(0, prot_deficit) * 4) / total_deficit_kcal
    pct_c = (max(0, carb_deficit) * 4) / total_deficit_kcal
    pct_f = (max(0, fat_deficit) * 9) / total_deficit_kcal
    
    # Match user deficit ratio to nearest K-Means cluster
    user_need = np.array([[pct_p, pct_c, pct_f]])
    user_need_scaled = scaler.transform(user_need)
    predicted_cluster = kmeans.predict(user_need_scaled)[0]
    
    # Recommend foods belonging to that matching cluster
    recommended_subset = df[df["cluster"] == predicted_cluster]
    category_label = get_cluster_label(predicted_cluster, cluster_means)
    
    results = []
    # Sample up to 3 foods from the cluster
    sample = recommended_subset.sample(n=min(3, len(recommended_subset)), random_state=42)
    for _, row in sample.iterrows():
        results.append({
            "food_name": row["food_name"],
            "protein": float(row["protein"]),
            "carbs": float(row["carbs"]),
            "fat": float(row["fat"]),
            "category": category_label
        })
        
    return results

def forecast_weight_trajectory(weight_history: list, calorie_balance_history: list, current_weight: float) -> list:
    # calorie_balance_history contains: logged calories - TDEE for each recorded day
    days_logged = len(calorie_balance_history)
    
    # Check if we have enough historical data to fit a regression line
    if days_logged < 5:
        # Cold start: Create a synthetic training dataset based on thermodynamic metabolic logic
        # -7700 kcal deficit = roughly -1.0 kg weight change
        X_train = []
        y_train = []
        simulated_weight = current_weight
        
        for day in range(10):
            # Assume a baseline average calorie deficit of -500 kcal for training
            net_cal = -500
            X_train.append([day, net_cal])
            simulated_weight += (net_cal / 7700.0)
            y_train.append(simulated_weight)
            
        model = LinearRegression()
        model.fit(X_train, y_train)
    else:
        # Fit regression on the user's actual chronological data
        X_train = []
        y_train = []
        for day_num, balance in enumerate(calorie_balance_history):
            X_train.append([day_num, balance])
            y_train.append(weight_history[day_num])
            
        model = LinearRegression()
        model.fit(X_train, y_train)
        
    # Calculate user's average historical daily calorie balance
    avg_balance = float(np.mean(calorie_balance_history)) if days_logged > 0 else -500.0
    
    # Predict chronological weight logs for the next 30 days
    start_day = days_logged if days_logged > 0 else 0
    predictions = []
    
    for day in range(1, 31):
        future_day = start_day + day
        pred_w = model.predict([[future_day, avg_balance]])[0]
        # Make sure predicted weight doesn't drop to zero or negative
        pred_w = max(pred_w, 30.0)
        predictions.append({
            "day": day,
            "weight": round(float(pred_w), 2)
        })
        
    return predictions
