import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    # RealDictCursor lagana compulsory hai taaki PostgreSQL columns dictionary array keys support karein
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

def init_db():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. USERS TABLE (PostgreSQL schema configuration)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
           id SERIAL PRIMARY KEY,
           username TEXT NOT NULL,
           email TEXT UNIQUE NOT NULL,
           password TEXT NOT NULL,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 2. PROJECTS TABLE (PostgreSQL schema configuration)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            project_name TEXT NOT NULL,
            html_code TEXT,
            css_code TEXT,
            js_code TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)

        # 3. MESSAGES TABLE (PostgreSQL schema configuration)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            user_id INTEGER, 
            chat_id TEXT NOT NULL,
            content TEXT NOT NULL,
            mode TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        conn.commit()
        print("Database tables initialized successfully on Supabase!")
    except Exception as db_err:
        print(f"Database Table Initialization Failure: {db_err}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Initialize DB structure framework safely on module discovery context
if __name__ == "__main__":
    init_db()
