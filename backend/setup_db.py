import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME", "snis")

def setup_database():
    if not DB_PASSWORD:
        print("[-] Error: DB_PASSWORD is not set in the .env file.")
        print("[*] Please copy .env.template to .env and fill in your password.")
        return

    print(f"[*] Connecting to PostgreSQL server at {DB_HOST}:{DB_PORT} as user '{DB_USER}'...")
    try:
        # Connect to the default 'postgres' database first, as the target db might not exist yet
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if target database exists
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
        exists = cursor.fetchone()
        
        if not exists:
            print(f"[*] Database '{DB_NAME}' does not exist. Creating database...")
            cursor.execute(f"CREATE DATABASE {DB_NAME}")
            print(f"[+] Database '{DB_NAME}' successfully created!")
        else:
            print(f"[+] Database '{DB_NAME}' already exists.")
            
        cursor.close()
        conn.close()
    except psycopg2.OperationalError as e:
        print("\n[-] Operational Connection Error!")
        print("Please check that:")
        print("  1. PostgreSQL is installed and running on your local machine.")
        print("  2. The port (5432) and host (localhost) are correct.")
        print("  3. The DB_PASSWORD in your .env file matches your PostgreSQL password.")
        print(f"\nDetails:\n{e}")
    except Exception as e:
        print(f"[-] An unexpected error occurred: {e}")

if __name__ == "__main__":
    setup_database()
