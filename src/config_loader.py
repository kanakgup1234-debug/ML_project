import os
import json

CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config', 'config.json'))

def load_config():
    """Loads and returns the main configuration dictionary."""
    if not os.path.exists(CONFIG_PATH):
        raise FileNotFoundError(f"Configuration file not found at {CONFIG_PATH}")
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)

def get_all_quizzes(config=None):
    """Returns a flat list of all quiz names configured."""
    if config is None:
        config = load_config()
    quizzes = []
    for module in config.get('modules', []):
        quizzes.extend(module.get('quizzes', []))
    return quizzes

def get_quiz_to_module_map(config=None):
    """Returns a dict mapping quiz name to its parent module name."""
    if config is None:
        config = load_config()
    mapping = {}
    for module in config.get('modules', []):
        m_name = module.get('name')
        for q in module.get('quizzes', []):
            mapping[q] = m_name
    return mapping

def get_quiz_max_marks_map(config=None):
    """Returns a dict mapping quiz name to its max score."""
    if config is None:
        config = load_config()
        
    global_map = config.get('quiz_max_marks')
    if global_map:
        return global_map
        
    mapping = {}
    for module in config.get('modules', []):
        max_marks = module.get('max_marks_per_quiz', 10)
        for q in module.get('quizzes', []):
            mapping[q] = max_marks
    return mapping

def get_grading_scale(config=None):
    """Returns grading thresholds sorted in descending order of min_percentile."""
    if config is None:
        config = load_config()
    scale = config.get('grading_scale', [])
    # Sort descending to easily check conditions
    return sorted(scale, key=lambda x: x['min_percentile'], reverse=True)

def get_email_settings(config=None):
    """Returns email SMTP configuration."""
    if config is None:
        config = load_config()
    return config.get('email_settings', {})
