from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Connect to your database
engine = create_engine("sqlite:///./music_tutor.db")
Session = sessionmaker(bind=engine)
session = Session()

try:
    # 1. Fetch Users
    print("\n--- USERS ---")
    with engine.connect() as con:
        result = con.execute(text("SELECT id, username FROM users"))
        for row in result:
            print(f"ID: {row.id} | Username: {row.username}")

    # 2. Fetch History
    print("\n--- HISTORY ---")
    with engine.connect() as con:
        result = con.execute(text("SELECT id, score, date, user_id FROM history"))
        for row in result:
            print(f"Lesson ID: {row.id} | Score: {row.score}% | User ID: {row.user_id} | Date: {row.date}")

except Exception as e:
    print(f"Error: {e}")