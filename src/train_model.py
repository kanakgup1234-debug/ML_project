import os
import sys
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score, classification_report

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import config_loader

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'output'))
MODEL_PATH_REG = os.path.join(OUTPUT_DIR, 'student_score_predictor.pkl')
MODEL_PATH_CLF = os.path.join(OUTPUT_DIR, 'student_grade_predictor.pkl')

def train_models():
    print("="*60)
    print("Training ML Models on Student Performance Dataset")
    print("="*60)
    
    master_csv = os.path.join(OUTPUT_DIR, "master_performance.csv")
    if not os.path.exists(master_csv):
        print(f"Error: Master performance dataset not found at {master_csv}")
        print("Please run the processor first (python main.py --run)")
        return
        
    df = pd.read_csv(master_csv)
    if len(df) < 5:
        print("Error: Dataset is too small to train models. Need at least 5 student records.")
        return
        
    # We will use early quizzes (Module 1) as features to predict the final cumulative percentage/grade
    # Features: Day 1, Day 2, Day 3, Day 4 quizzes
    features = ["day1_module1_quiz1", "day2_module1_quiz2", "day3_module1_quiz3", "day4_module1_quiz4"]
    
    # Check if all features exist in the dataset
    features_present = [f for f in features if f in df.columns]
    if not features_present:
        print(f"Error: None of the target features {features} found in dataset columns: {df.columns.tolist()}")
        return
        
    print(f"Using early quiz features: {features_present}")
    
    X = df[features_present]
    y_reg = df["Cumulative_Pct"]
    y_clf = df["Grade"]
    
    # Split the dataset (80% train, 20% test)
    # Using random state for reproducibility
    random_state = 42
    
    print(f"Total students in dataset: {len(df)}")
    
    # ------------------ 1. Regression Model (Score Predictor) ------------------
    print("\n--- Training Regression Model (Random Forest Regressor) ---")
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X, y_reg, test_size=0.2, random_state=random_state)
    
    reg_model = RandomForestRegressor(n_estimators=100, random_state=random_state)
    reg_model.fit(X_train_r, y_train_r)
    
    y_pred_r = reg_model.predict(X_test_r)
    mae = mean_absolute_error(y_test_r, y_pred_r)
    r2 = r2_score(y_test_r, y_pred_r)
    
    print(f"Mean Absolute Error (MAE): {mae:.2f}%")
    print(f"R-squared (R2) Score: {r2:.4f}")
    
    # Print Feature Importances
    print("\nFeature Importances (Regression):")
    importances_r = reg_model.feature_importances_
    indices_r = np.argsort(importances_r)[::-1]
    for f in range(X.shape[1]):
        print(f" - {X.columns[indices_r[f]]}: {importances_r[indices_r[f]]*100:.2f}%")
        
    # Save Regression Model metadata
    reg_model_data = {
        'model': reg_model,
        'features': features_present,
        'mae': mae,
        'r2': r2
    }
    joblib.dump(reg_model_data, MODEL_PATH_REG)
    print(f"Saved regression model to: {MODEL_PATH_REG}")
    
    # ------------------ 2. Classification Model (Grade Predictor) ------------------
    print("\n--- Training Classification Model (Random Forest Classifier) ---")
    # For classification, let's ensure we can stratify if there are enough classes, otherwise simple split
    try:
        X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X, y_clf, test_size=0.2, random_state=random_state, stratify=y_clf)
    except ValueError:
        # Fall back if some grades have only 1 member
        X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X, y_clf, test_size=0.2, random_state=random_state)
        
    clf_model = RandomForestClassifier(n_estimators=100, random_state=random_state)
    clf_model.fit(X_train_c, y_train_c)
    
    y_pred_c = clf_model.predict(X_test_c)
    acc = accuracy_score(y_test_c, y_pred_c)
    
    print(f"Accuracy Score: {acc*100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test_c, y_pred_c, zero_division=0))
    
    # Save Classification Model metadata
    clf_model_data = {
        'model': clf_model,
        'features': features_present,
        'accuracy': acc
    }
    joblib.dump(clf_model_data, MODEL_PATH_CLF)
    print(f"Saved classification model to: {MODEL_PATH_CLF}")
    
    # Generate predictions JSON for all students (MERN stack backend bridge)
    predictions_dict = {}
    import json
    for _, row in df.iterrows():
        email = str(row["Email"]).strip().lower()
        student_features = [row[f] for f in features_present]
        pred_score_val = reg_model.predict([student_features])[0]
        pred_grade_val = clf_model.predict([student_features])[0]
        predictions_dict[email] = {
            "predictedScore": float(pred_score_val),
            "predictedGrade": str(pred_grade_val)
        }
    predictions_json_path = os.path.join(OUTPUT_DIR, "predictions.json")
    with open(predictions_json_path, "w") as f:
        json.dump(predictions_dict, f, indent=2)
    print(f"Saved predictions JSON to: {predictions_json_path}")
    
    print("\n" + "="*60)
    print("Model Training Successfully Completed!")
    print("="*60)

if __name__ == "__main__":
    train_models()
