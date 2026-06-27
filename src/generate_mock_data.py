import os
import random
import pandas as pd
from datetime import datetime, timedelta
import config_loader

def generate_mock_roster():
    # 30 mock students with different performance characteristics
    students = [
        {"name": "Aarav Sharma", "email": "aarav.sharma@example.com", "tier": "excellent"},
        {"name": "Aditya Patel", "email": "aditya.patel@example.com", "tier": "excellent"},
        {"name": "Ananya Iyer", "email": "ananya.iyer@example.com", "tier": "excellent"},
        {"name": "Arjun Verma", "email": "arjun.verma@example.com", "tier": "excellent"},
        {"name": "Diya Nair", "email": "diya.nair@example.com", "tier": "excellent"},
        {"name": "Ishaan Reddy", "email": "ishaan.reddy@example.com", "tier": "good"},
        {"name": "Kabir Gupta", "email": "kabir.gupta@example.com", "tier": "good"},
        {"name": "Meera Joshi", "email": "meera.joshi@example.com", "tier": "good"},
        {"name": "Neha Kapoor", "email": "neha.kapoor@example.com", "tier": "good"},
        {"name": "Pranav Rao", "email": "pranav.rao@example.com", "tier": "good"},
        {"name": "Rohan Saxena", "email": "rohan.saxena@example.com", "tier": "good"},
        {"name": "Sanya Malhotra", "email": "sanya.malhotra@example.com", "tier": "good"},
        {"name": "Siddharth Sen", "email": "siddharth.sen@example.com", "tier": "good"},
        {"name": "Tanvi Bhatia", "email": "tanvi.bhatia@example.com", "tier": "good"},
        {"name": "Vihaan Mishra", "email": "vihaan.mishra@example.com", "tier": "average"},
        {"name": "Zara Khan", "email": "zara.khan@example.com", "tier": "average"},
        {"name": "Amit Choudhury", "email": "amit.choudhury@example.com", "tier": "average"},
        {"name": "Devendra Singh", "email": "devendra.singh@example.com", "tier": "average"},
        {"name": "Gita Kumari", "email": "gita.kumari@example.com", "tier": "average"},
        {"name": "Harish Patel", "email": "harish.patel@example.com", "tier": "average"},
        {"name": "Karan Johar", "email": "karan.johar@example.com", "tier": "average"},
        {"name": "Lata Mangeshkar", "email": "lata.m@example.com", "tier": "average"},
        {"name": "Manoj Bajpayee", "email": "manoj.b@example.com", "tier": "average"},
        {"name": "Nisha Roy", "email": "nisha.roy@example.com", "tier": "average"},
        {"name": "Pooja Hegde", "email": "pooja.h@example.com", "tier": "average"},
        {"name": "Rajesh Khanna", "email": "rajesh.k@example.com", "tier": "weak"},
        {"name": "Seema Biswas", "email": "seema.b@example.com", "tier": "weak"},
        {"name": "Umesh Yadav", "email": "umesh.y@example.com", "tier": "weak"},
        {"name": "Vijay Kumar", "email": "vijay.k@example.com", "tier": "weak"},
        {"name": "Yash Das", "email": "yash.das@example.com", "tier": "weak"}
    ]
    return students

def generate_score(tier, max_marks):
    if tier == "excellent":
        return random.randint(int(max_marks * 0.8), max_marks)
    elif tier == "good":
        return random.randint(int(max_marks * 0.6), int(max_marks * 0.95))
    elif tier == "average":
        return random.randint(int(max_marks * 0.4), int(max_marks * 0.8))
    else: # weak
        return random.randint(int(max_marks * 0.2), int(max_marks * 0.6))

def main():
    config = config_loader.load_config()
    quizzes = config_loader.get_all_quizzes(config)
    quiz_max_marks = config_loader.get_quiz_max_marks_map(config)
    
    students = generate_mock_roster()
    
    # Target directory
    quizzes_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'quizzes'))
    os.makedirs(quizzes_dir, exist_ok=True)
    
    start_time = datetime.now() - timedelta(days=26)
    
    # Store master student list for optional verification
    master_df = pd.DataFrame([{"Name": s["name"], "Email Address": s["email"]} for s in students])
    master_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config', 'students_master.csv'))
    master_df.to_csv(master_path, index=False)
    print(f"Created students master list at {master_path}")
    
    # Generate daily quiz CSVs
    for i, quiz_name in enumerate(quizzes):
        max_marks = quiz_max_marks.get(quiz_name, 10)
        quiz_data = []
        
        # Simulate some students missing a quiz (say, 0-2 students)
        absent_count = random.randint(0, 2)
        absent_emails = random.sample([s["email"] for s in students], absent_count) if absent_count > 0 else []
        
        quiz_time = start_time + timedelta(days=i)
        
        for student in students:
            if student["email"] in absent_emails:
                continue
                
            raw_score = generate_score(student["tier"], max_marks)
            
            # Format score: mix it up: "8 / 10" or "8"
            if random.random() > 0.3:
                score_str = f"{raw_score} / {max_marks}"
            else:
                score_str = str(raw_score)
                
            timestamp = (quiz_time + timedelta(minutes=random.randint(10, 120))).strftime('%Y-%m-%d %H:%M:%S')
            
            quiz_data.append({
                "Timestamp": timestamp,
                "Email Address": student["email"],
                "Name": student["name"],
                "Score": score_str
            })
            
        df = pd.DataFrame(quiz_data)
        file_path = os.path.join(quizzes_dir, f"{quiz_name}.csv")
        df.to_csv(file_path, index=False)
        print(f"Generated quiz file: {file_path} (responses: {len(df)})")

if __name__ == "__main__":
    main()
