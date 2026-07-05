import os
import hashlib
import io
import base64
import math
import numpy as np
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
import config_loader

# Use matplotlib in headless mode
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

import qrcode

TEMPLATE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))
OUTPUT_CARDS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'output', 'grade_cards'))

def generate_verification_hash(email, score):
    """Generates a short hash to print on the grade card for verification."""
    hash_obj = hashlib.sha256(f"{email}:{score}:LIET_SUMMER_2026".encode())
    return hash_obj.hexdigest()[:12].upper()

def clean_module_name(name):
    """Maps long module names to clean display names matching the grade card format."""
    mapping = {
        "Module 1: Python and Math for ML": "Module 1 : Python",
        "Module 2: Classical Machine Learning": "Module 2 : NumPy Essentials",
        "Module 3: Unsupervised & Ensemble Learning": "Module 3 : Pandas",
        "Module 4: Deep Learning & NLP": "Module 4 : Deep Learning",
        "Module 5: LLMs & Agentic AI": "Module 5 : LLMs & Agents"
    }
    return mapping.get(name, name)

def get_ai_remarks(grade):
    """Returns contextual AI remarks based on the grade received."""
    remarks_map = {
        "A+": "Outstanding Performance. Demonstrates deep understanding and mastery of concepts.",
        "A": "Excellent Performance. Strong grasp of all modules with great analytical skills.",
        "B+": "Very Good Performance. Has a solid grasp of concepts with scope for further improvement.",
        "B": "Good Performance. Understands the key concepts well with minor areas to improve.",
        "C": "Satisfactory Performance. Basic understanding, requires more hands-on practice.",
        "D": "Needs Improvement. Re-assessment of foundational topics is recommended.",
        "F": "Fail. Requires thorough review and complete retraining of the course modules."
    }
    return remarks_map.get(grade, "Good effort. Keep practicing to enhance your skills.")

def generate_performance_chart(modules_data):
    """Generates a bar chart of module-wise performance and returns it as a base64 string."""
    names = []
    pcts = []
    
    for m in modules_data:
        val = m["pct"]
        # Skip nan or invalid percentages
        if val is None or math.isnan(val) or (isinstance(val, float) and np.isnan(val)):
            continue
        names.append(clean_module_name(m["name"]))
        pcts.append(val)
        
    if not pcts:
        return ""
        
    plt.figure(figsize=(6.5, 3))
    plt.bar(names, pcts, color="#1f77b4", width=0.5)
    plt.title("Module-wise Performance", fontsize=10, fontweight="bold", pad=10)
    plt.ylabel("Percentage", fontsize=8)
    plt.ylim(0, 100)
    plt.xticks(rotation=30, ha="right", fontsize=8)
    plt.yticks(fontsize=8)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150)
    plt.close()
    buf.seek(0)
    
    return base64.b64encode(buf.read()).decode("utf-8")

def generate_qr_code(data_str):
    """Generates a QR code image as a base64 string."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=4,
        border=1,
    )
    qr.add_data(data_str)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    
    return base64.b64encode(buf.read()).decode("utf-8")

def generate_all_cards(df_students):
    """Generates an HTML grade card for every student in df_students."""
    os.makedirs(OUTPUT_CARDS_DIR, exist_ok=True)
    
    config = config_loader.load_config()
    module_details = config.get("modules", [])
    
    # Compute Class Average dynamically
    class_average = df_students["Cumulative_Pct"].mean() if not df_students.empty else 75.0
    
    # Initialize Jinja2
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    try:
        template = env.get_template('grade_card_template.html')
    except Exception as e:
        print(f"Error loading template: {e}")
        return
        
    cards_count = 0
    
    for _, student in df_students.iterrows():
        email = student["Email"]
        name = student["Name"]
        cumulative_score = student["Cumulative_Score"]
        cumulative_max = student["Cumulative_Max"]
        cumulative_pct = student["Cumulative_Pct"]
        final_percentile = student["Final_Percentile"]
        rank = int(student["Rank"])
        grade = student["Grade"]
        
        # Prepare modules data
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
        
        # Clean module names for display in the table
        display_modules = []
        for sm in student_modules:
            display_modules.append({
                "name": clean_module_name(sm["name"]),
                "pct_str": "nan" if (sm["pct"] is None or math.isnan(sm["pct"]) or (isinstance(sm["pct"], float) and np.isnan(sm["pct"]))) else f"{sm['pct']:.1f}"
            })
            
        # Generate chart
        chart_base64 = generate_performance_chart(student_modules)
        
        # Verification ID and QR Code
        verify_id = f"LIET-MLAI-{rank:03d}"
        qr_base64 = generate_qr_code(f"https://liet.in/verify/{verify_id}")
        
        # AI Remarks
        ai_remarks = get_ai_remarks(grade)
        
        # Render template
        rendered_html = template.render(
            student_name=name,
            student_email=email,
            cumulative_score=cumulative_score,
            cumulative_max=cumulative_max,
            cumulative_pct=cumulative_pct,
            final_percentile=final_percentile,
            rank=rank,
            grade=grade,
            modules=display_modules,
            verify_hash=verify_hash,
            chart_base64=chart_base64,
            qr_base64=qr_base64,
            verify_id=verify_id,
            ai_remarks=ai_remarks,
            class_average=class_average
        )
        
        # Clean email name for filename safety
        safe_email = email.replace('@', '_').replace('.', '_')
        card_file_path = os.path.join(OUTPUT_CARDS_DIR, f"{safe_email}.html")
        
        with open(card_file_path, 'w', encoding='utf-8') as f:
            f.write(rendered_html)
            
        cards_count += 1
        
    print(f"Successfully generated {cards_count} grade cards in: {OUTPUT_CARDS_DIR}")
    return OUTPUT_CARDS_DIR
