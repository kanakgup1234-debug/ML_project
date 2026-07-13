import os
import sys
import argparse

# Add src/ to python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

import processor
import card_generator
import emailer
import detector

def run_pipeline():
    print("="*60)
    print("Starting Training Performance Management Pipeline")
    print("="*60)
    
    # 1. Process quiz inputs & generate summaries
    df_students = processor.process_results()
    if df_students is None:
        print("Pipeline aborted: No data processed.")
        return
        
    # 2. Generate grade cards (Generated on demand during emailing phase)
    # cards_dir = card_generator.generate_all_cards(df_students)
    
    # 3. Send performance report emails (Only sent via manual dispatch from UI/CLI)
    # emailer.email_all_reports(df_students, cards_dir)
    
    print("="*60)
    print("Pipeline Execution Completed Successfully.")
    print("="*60)

def main():
    parser = argparse.ArgumentParser(description="Automated Training Performance Management System CLI")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--run', action='store_true', help='Run the computation, card generation, and emailing pipeline once')
    group.add_argument('--watch', action='store_true', help='Run in background and monitor the quizzes/ directory for new submissions')
    group.add_argument('--mock-data', action='store_true', help='Generate mock quiz data for 25 days/quizzes')
    group.add_argument('--train', action='store_true', help='Train ML models on the processed student dataset')
    group.add_argument('--email-all', action='store_true', help='Send report card emails to all students')
    group.add_argument('--email-one', type=str, help='Send report card email to a specific student email')

    args = parser.parse_args()
    
    if args.mock_data:
        print("Generating mock data...")
        import generate_mock_data
        generate_mock_data.main()
        print("Mock data generated successfully in 'quizzes/'.")
        
    elif args.run:
        run_pipeline()
        
    elif args.watch:
        quizzes_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'quizzes'))
        print(f"Monitoring '{quizzes_dir}' for newly added quiz files...")
        detector.start_watching(quizzes_dir, run_pipeline)
        
    elif args.train:
        import train_model
        train_model.train_models()

    elif args.email_all:
        print("Starting bulk performance report emailing process...")
        df_students = processor.process_results()
        if df_students is None:
            print("Email dispatch aborted: No student data found to email.")
            sys.exit(1)
        cards_dir = card_generator.generate_all_cards(df_students)
        emailer.email_all_reports(df_students, cards_dir)

    elif args.email_one:
        target_email = args.email_one.strip().lower()
        print(f"Starting performance report emailing process for: {target_email}")
        df_students = processor.process_results()
        if df_students is None:
            print("Email dispatch aborted: No student data found.")
            sys.exit(1)
            
        student_row = df_students[df_students["Email"] == target_email]
        if student_row.empty:
            print(f"Error: Student with email '{target_email}' not found in roster.")
            sys.exit(1)
            
        student = student_row.iloc[0]
        cards_dir = card_generator.generate_all_cards(df_students)
        safe_email = target_email.replace('@', '_').replace('.', '_')
        card_path = os.path.join(cards_dir, f"{safe_email}.html")
        
        success, msg = emailer.send_performance_email(
            student["Name"], 
            student["Email"], 
            card_path, 
            student["Cumulative_Pct"], 
            student["Grade"], 
            student["Rank"]
        )
        print(f"Email Dispatch Result: {msg}")

if __name__ == "__main__":
    main()
