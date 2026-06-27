import os
import hashlib
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
import config_loader

TEMPLATE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))
OUTPUT_CARDS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'output', 'grade_cards'))

def generate_verification_hash(email, score):
    """Generates a short hash to print on the grade card for verification."""
    hash_obj = hashlib.sha256(f"{email}:{score}:LIET_SUMMER_2026".encode())
    return hash_obj.hexdigest()[:12].upper()

def generate_all_cards(df_students):
    """Generates an HTML grade card for every student in df_students."""
    os.makedirs(OUTPUT_CARDS_DIR, exist_ok=True)
    
    config = config_loader.load_config()
    module_details = config.get("modules", [])
    
    # Initialize Jinja2
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    try:
        template = env.get_template('grade_card_template.html')
    except Exception as e:
        print(f"Error loading template: {e}")
        return
        
    date_str = datetime.now().strftime('%B %d, %Y')
    cards_count = 0
    
    for _, student in df_students.iterrows():
        email = student["Email"]
        name = student["Name"]
        cumulative_score = student["Cumulative_Score"]
        cumulative_max = student["Cumulative_Max"]
        cumulative_pct = student["Cumulative_Pct"]
        final_percentile = student["Final_Percentile"]
        rank = student["Rank"]
        grade = student["Grade"]
        
        # Prepare modules data for template
        student_modules = []
        for mod in module_details:
            mod_name = mod["name"]
            student_modules.append({
                "name": mod_name,
                "score": student[f"{mod_name}_score"],
                "max": student[f"{mod_name}_max"],
                "pct": student[f"{mod_name}_pct"],
                "percentile": student[f"{mod_name}_percentile"]
            })
            
        verify_hash = generate_verification_hash(email, cumulative_score)
        
        # Render template
        rendered_html = template.render(
            student_name=name,
            student_email=email,
            date_str=date_str,
            cumulative_score=cumulative_score,
            cumulative_max=cumulative_max,
            cumulative_pct=cumulative_pct,
            final_percentile=final_percentile,
            rank=rank,
            grade=grade,
            modules=student_modules,
            verify_hash=verify_hash
        )
        
        # Clean email name for filename safety
        safe_email = email.replace('@', '_').replace('.', '_')
        card_file_path = os.path.join(OUTPUT_CARDS_DIR, f"{safe_email}.html")
        
        with open(card_file_path, 'w', encoding='utf-8') as f:
            f.write(rendered_html)
            
        cards_count += 1
        
    print(f"Successfully generated {cards_count} grade cards in: {OUTPUT_CARDS_DIR}")
    return OUTPUT_CARDS_DIR
