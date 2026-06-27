import os
import glob
import re
import pandas as pd
import numpy as np
import config_loader

def parse_score(score_val, max_score=10):
    """Parses a score like '8 / 10', '8/10', '8.0' or 8 into a float."""
    if pd.isna(score_val):
        return 0.0
    val_str = str(score_val).strip()
    # Match pattern like "8 / 10" or "8/10"
    match = re.match(r'^([\d\.]+)\s*/\s*([\d\.]+)$', val_str)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return 0.0
    # Match a single number
    try:
        return float(val_str)
    except ValueError:
        return 0.0

def calculate_percentile(series):
    """Calculates percentile for a series of scores.
    Percentile = (number of scores <= current score) / total_scores * 100
    """
    if len(series) == 0:
        return series
    # We can use scipy-like percentile formula: (rank / n) * 100
    # Using pandas rank with method='min' or 'max'. 'min' or average is standard.
    # Let's use rank(method='min') for standard competitive percentile.
    # But wait, a simple custom formula is very clear:
    ranks = series.rank(method='min', ascending=True)
    percentiles = (ranks / len(series)) * 100
    return percentiles

def process_results():
    config = config_loader.load_config()
    quizzes = config_loader.get_all_quizzes(config)
    quiz_to_module = config_loader.get_quiz_to_module_map(config)
    quiz_max_marks = config_loader.get_quiz_max_marks_map(config)
    grading_scale = config_loader.get_grading_scale(config)
    
    quizzes_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'quizzes'))
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'output'))
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Load all quiz files found
    quiz_files = glob.glob(os.path.join(quizzes_dir, "*.csv"))
    if not quiz_files:
        print("No quiz CSV files found in 'quizzes/'.")
        return None
        
    print(f"Found {len(quiz_files)} quiz files to process.")
    
    # Structure to hold student info and their scores
    # key: email, value: { 'name': name, 'scores': {quiz_name: score} }
    student_records = {}
    processed_quizzes = []
    
    for file_path in quiz_files:
        filename = os.path.basename(file_path)
        quiz_name, ext = os.path.splitext(filename)
        
        # Verify if this quiz is in config
        if quiz_name not in quizzes:
            print(f"Skipping {filename}: not in config quiz list.")
            continue
            
        processed_quizzes.append(quiz_name)
        max_marks = quiz_max_marks.get(quiz_name, 10)
        
        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            continue
            
        # Standardize columns (ignore case, spaces)
        email_col = None
        name_col = None
        score_col = None
        
        for col in df.columns:
            col_lower = col.strip().lower()
            if 'email' in col_lower:
                email_col = col
            elif 'name' in col_lower:
                name_col = col
            elif 'score' in col_lower or 'mark' in col_lower:
                score_col = col
                
        if not email_col or not score_col:
            print(f"Warning: {filename} must contain an Email and Score column. Skipping.")
            continue
            
        for _, row in df.iterrows():
            email = str(row[email_col]).strip().lower()
            if not email or email == 'nan':
                continue
                
            name = str(row[name_col]).strip() if name_col and not pd.isna(row[name_col]) else "Unknown Student"
            raw_score = parse_score(row[score_col], max_marks)
            
            if email not in student_records:
                student_records[email] = {
                    "Name": name,
                    "Email": email,
                    "Scores": {}
                }
            # Overwrite name if it's currently Unknown and we found a valid name
            if student_records[email]["Name"] == "Unknown Student" and name != "Unknown Student":
                student_records[email]["Name"] = name
                
            student_records[email]["Scores"][quiz_name] = raw_score

    if not student_records:
        print("No student records processed.")
        return None

    # Get master roster to fill missing student names if they missed the first quizzes but are in the master list
    master_roster_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config', 'students_master.csv'))
    if os.path.exists(master_roster_path):
        try:
            roster_df = pd.read_csv(master_roster_path)
            for _, row in roster_df.iterrows():
                email = str(row.get("Email Address", row.get("Email", ""))).strip().lower()
                name = str(row.get("Name", "Unknown Student")).strip()
                if email and email not in student_records:
                    student_records[email] = {
                        "Name": name,
                        "Email": email,
                        "Scores": {}
                    }
                elif email and student_records[email]["Name"] == "Unknown Student":
                    student_records[email]["Name"] = name
        except Exception as e:
            print(f"Could not load master roster: {e}")

    # Convert to DataFrame
    records_list = []
    for email, info in student_records.items():
        row_dict = {"Email": email, "Name": info["Name"]}
        for q in quizzes:
            # If student missed quiz, mark score as 0
            row_dict[q] = info["Scores"].get(q, 0.0)
        records_list.append(row_dict)
        
    df_students = pd.DataFrame(records_list)
    
    # 2. Perform calculations
    # Map out max marks per module
    module_details = config.get("modules", [])
    
    # Let's compute quiz percentages
    for q in quizzes:
        max_marks = quiz_max_marks.get(q, 10)
        df_students[f"{q}_pct"] = (df_students[q] / max_marks) * 100
        
    # Calculate module-wise performance
    module_columns = []
    for mod in module_details:
        mod_name = mod["name"]
        mod_quizzes = [q for q in mod["quizzes"] if q in df_students.columns]
        
        # If no quizzes have been conducted for this module, sum will be 0
        mod_max_marks = sum(quiz_max_marks.get(q, 10) for q in mod["quizzes"])
        
        # Calculate marks obtained for this module
        df_students[f"{mod_name}_score"] = df_students[mod_quizzes].sum(axis=1) if mod_quizzes else 0.0
        df_students[f"{mod_name}_max"] = mod_max_marks
        df_students[f"{mod_name}_pct"] = (df_students[f"{mod_name}_score"] / mod_max_marks) * 100
        
        # Percentile within this module
        df_students[f"{mod_name}_percentile"] = calculate_percentile(df_students[f"{mod_name}_score"])
        module_columns.append(mod_name)
        
    # Calculate cumulative overall performance
    total_max_marks = sum(quiz_max_marks.get(q, 10) for q in quizzes)
    df_students["Cumulative_Score"] = df_students[quizzes].sum(axis=1)
    df_students["Cumulative_Max"] = total_max_marks
    df_students["Cumulative_Pct"] = (df_students["Cumulative_Score"] / total_max_marks) * 100
    
    # Calculate overall Final Percentile
    df_students["Final_Percentile"] = calculate_percentile(df_students["Cumulative_Score"])
    
    # Rank (overall rank based on cumulative score, descending)
    # Using method='min' and rank is 1-based, descending
    df_students["Rank"] = df_students["Cumulative_Score"].rank(method='min', ascending=False).astype(int)
    
    # Assign Grade based on final percentile
    def assign_grade(pct_val):
        for scale in grading_scale:
            if pct_val >= scale["min_percentile"]:
                return scale["grade"]
        return "F"
        
    df_students["Grade"] = df_students["Final_Percentile"].apply(assign_grade)
    
    # 3. Export Master Performance File
    master_cols = ["Name", "Email", "Cumulative_Score", "Cumulative_Max", "Cumulative_Pct", "Final_Percentile", "Rank", "Grade"]
    # Append all quiz scores and percentages
    for q in quizzes:
        master_cols.extend([q, f"{q}_pct"])
    # Append all module scores, percentages, and percentiles
    for mod_name in module_columns:
        master_cols.extend([f"{mod_name}_score", f"{mod_name}_max", f"{mod_name}_pct", f"{mod_name}_percentile"])
        
    df_master = df_students[master_cols]
    master_file_path = os.path.join(output_dir, "master_performance.csv")
    df_master.to_csv(master_file_path, index=False)
    print(f"Generated Master Performance File: {master_file_path}")
    
    # 4. Export Final Rankings File
    ranking_cols = ["Rank", "Name", "Email", "Cumulative_Score", "Cumulative_Max", "Cumulative_Pct", "Final_Percentile", "Grade"]
    for mod_name in module_columns:
        ranking_cols.append(f"{mod_name}_pct")
        ranking_cols.append(f"{mod_name}_percentile")
        
    df_rankings = df_students[ranking_cols].sort_values(by="Rank")
    rankings_file_path = os.path.join(output_dir, "final_rankings.csv")
    df_rankings.to_csv(rankings_file_path, index=False)
    print(f"Generated Final Rankings File: {rankings_file_path}")
    
    # 5. Export Module Summary File
    module_summary_data = []
    for mod in module_details:
        mod_name = mod["name"]
        mod_scores = df_students[f"{mod_name}_score"]
        mod_pcts = df_students[f"{mod_name}_pct"]
        max_possible = sum(quiz_max_marks.get(q, 10) for q in mod["quizzes"])
        
        module_summary_data.append({
            "Module Name": mod_name,
            "Quizzes Included": ", ".join(mod["quizzes"]),
            "Max Marks": max_possible,
            "Average Score": round(mod_scores.mean(), 2),
            "Highest Score": mod_scores.max(),
            "Lowest Score": mod_scores.min(),
            "Average Percentage": round(mod_pcts.mean(), 2),
            "Highest Percentage": round(mod_pcts.max(), 2),
            "Lowest Percentage": round(mod_pcts.min(), 2),
            "Standard Deviation": round(mod_scores.std(), 2) if len(mod_scores) > 1 else 0.0
        })
        
    df_summary = pd.DataFrame(module_summary_data)
    summary_file_path = os.path.join(output_dir, "module_summary.csv")
    df_summary.to_csv(summary_file_path, index=False)
    print(f"Generated Module Summary File: {summary_file_path}")
    
    return df_students

if __name__ == "__main__":
    process_results()
