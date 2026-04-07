"""
SQLAlchemy ORM models (database tables).
Separate from Pydantic models in models.py.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    full_name     = Column(String(100), nullable=False)
    email         = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    is_active     = Column(Boolean, default=True)
    is_verified   = Column(Boolean, default=True)   # skip email verify for now
    created_at    = Column(DateTime, default=datetime.utcnow)
    last_login    = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User {self.email}>"
