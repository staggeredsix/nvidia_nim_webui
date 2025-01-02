# app/dependencies.py
from typing import Generator
from fastapi import Depends Sessions
from sqlalchemy.orm import
from .models.database import SessionLocal

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
