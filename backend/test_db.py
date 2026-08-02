# import os

# from pathlib import Path

# from dotenv import load_dotenv
# from sqlalchemy import create_engine, text

# ENV_FILE = Path(__file__).resolve().parent / "backend" / ".env"
# load_dotenv(ENV_FILE)

# DATABASE_URL = os.getenv("DATABASE_URL")

# engine = create_engine(DATABASE_URL)

# try:
#     with engine.connect() as conn:
#         version = conn.execute(text("SELECT version();"))
#         print("Connected successfully!")
#         print(version.fetchone()[0])

# except Exception as e:
#     print(e)

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        version = conn.execute(text("SELECT version();"))
        print("Connected successfully!")
        print(version.fetchone()[0])

except Exception as e:
    print(e)