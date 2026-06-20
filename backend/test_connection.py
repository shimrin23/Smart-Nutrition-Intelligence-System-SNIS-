import os
import psycopg2
from dotenv import load_dotenv

# Load environmental variables
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME", "snis")

def test_db_connection():
    if not DB_PASSWORD:
        print("[-] Error: DB_PASSWORD is not set in the .env file.")
        return

    print(f"[*] Testing connection to database '{DB_NAME}' at {DB_HOST}:{DB_PORT} as '{DB_USER}'...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()
        
        # Run a simple query to get the Postgres version
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        
        print(f"[+] Connection Successful!")
        print(f"[+] PostgreSQL Version: {db_version[0]}")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[-] Connection Failed! Details: {e}")

if __name__ == "__main__":
    test_db_connection()
