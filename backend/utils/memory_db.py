import os
import sqlite3
import json
import datetime
import uuid

# Define DB path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BACKEND_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'memory.db')

def get_connection():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. History Table (saves all review runs)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        pylint_score REAL,
        security_status TEXT,
        complexity_label TEXT,
        bug_risk_label TEXT,
        ai_review TEXT,
        code TEXT,
        full_report_json TEXT
    )
    ''')
    
    # 2. Chat Memory Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chat_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    ''')
    
    # 3. Preferences Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    ''')
    
    # 4. Adaptive Learning Table (tracks mistake frequencies & counts)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS adaptive_learning (
        metric_name TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0,
        details TEXT DEFAULT '[]'
    )
    ''')
    
    # Insert default preferences if not exists
    default_prefs = [
        ('experience_level', 'Intermediate'),
        ('coding_style', 'PEP8 standard'),
        ('framework_focus', 'General Python'),
        ('review_strictness', 'Normal'),
        ('security_priority', 'High')
    ]
    for key, val in default_prefs:
        cursor.execute('INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)', (key, val))
        
    conn.commit()
    conn.close()

# Initialize DB on import
init_db()

# --- DB METHODS ---

def save_review(filename, pylint_score, security_status, complexity_label, bug_risk_label, ai_review, code, full_report_json):
    conn = get_connection()
    cursor = conn.cursor()
    review_id = str(uuid.uuid4())
    timestamp = datetime.datetime.now().isoformat()
    
    cursor.execute('''
    INSERT INTO history (id, filename, timestamp, pylint_score, security_status, complexity_label, bug_risk_label, ai_review, code, full_report_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (review_id, filename, timestamp, pylint_score, security_status, complexity_label, bug_risk_label, ai_review, code, json.dumps(full_report_json)))
    
    conn.commit()
    conn.close()
    return review_id

def get_history():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, filename, timestamp, pylint_score, security_status, complexity_label, bug_risk_label FROM history ORDER BY timestamp DESC')
    rows = cursor.fetchall()
    history = [dict(row) for row in rows]
    conn.close()
    return history

def get_review(review_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM history WHERE id = ?', (review_id,))
    row = cursor.fetchone()
    if row:
        res = dict(row)
        res['full_report_json'] = json.loads(res['full_report_json'])
        conn.close()
        return res
    conn.close()
    return None

def delete_review(review_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM history WHERE id = ?', (review_id,))
    cursor.execute('DELETE FROM chat_memory WHERE review_id = ?', (review_id,))
    conn.commit()
    conn.close()
    return True

def get_chat_history(review_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    if review_id:
        cursor.execute('SELECT role, content, timestamp FROM chat_memory WHERE review_id = ? ORDER BY timestamp ASC', (review_id,))
    else:
        cursor.execute('SELECT role, content, timestamp FROM chat_memory WHERE review_id IS NULL ORDER BY timestamp ASC')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def save_chat_message(role, content, review_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    timestamp = datetime.datetime.now().isoformat()
    cursor.execute('''
    INSERT INTO chat_memory (review_id, role, content, timestamp)
    VALUES (?, ?, ?, ?)
    ''', (review_id, role, content, timestamp))
    conn.commit()
    conn.close()

def get_preferences():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT key, value FROM preferences')
    rows = cursor.fetchall()
    conn.close()
    return {row['key']: row['value'] for row in rows}

def set_preference(key, value):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
    INSERT INTO preferences (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
    ''', (key, value))
    conn.commit()
    conn.close()

def get_adaptive_learning():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT metric_name, count, details FROM adaptive_learning')
    rows = cursor.fetchall()
    conn.close()
    return {row['metric_name']: {'count': row['count'], 'details': json.loads(row['details'])} for row in rows}

def update_adaptive_metric(metric_name, increment=1, detail_item=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get existing
    cursor.execute('SELECT count, details FROM adaptive_learning WHERE metric_name = ?', (metric_name,))
    row = cursor.fetchone()
    
    if row:
        count = row['count'] + increment
        details = json.loads(row['details'])
    else:
        count = increment
        details = []
        
    if detail_item and detail_item not in details:
        details.append(detail_item)
        # Keep details list reasonable
        if len(details) > 10:
            details.pop(0)
            
    cursor.execute('''
    INSERT INTO adaptive_learning (metric_name, count, details)
    VALUES (?, ?, ?)
    ON CONFLICT(metric_name) DO UPDATE SET count=excluded.count, details=excluded.details
    ''', (metric_name, count, json.dumps(details)))
    
    conn.commit()
    conn.close()
