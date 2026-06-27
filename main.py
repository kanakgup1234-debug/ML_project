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
        
    # 2. Generate grade cards
    cards_dir = card_generator.generate_all_cards(df_students)
    
    # 3. Send performance report emails
    emailer.email_all_reports(df_students, cards_dir)
    
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

if __name__ == "__main__":
    main()
