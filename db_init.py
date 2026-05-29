import sqlite3
import os

DB = 'data.db'

def init_db():
    if os.path.exists(DB):
        print('Database already exists:', DB)
        return
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute('''
    CREATE TABLE recordings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id TEXT,
        prompt_text TEXT,
        filename TEXT,
        user_id TEXT,
        transcript TEXT,
        created_at TEXT
    )
    ''')
    conn.commit()
    conn.close()
    print('Initialized', DB)

if __name__ == '__main__':
    init_db()
