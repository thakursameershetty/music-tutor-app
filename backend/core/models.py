from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    attempts = relationship("History", back_populates="owner")

class History(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, index=True)
    score = Column(Integer)
    date = Column(DateTime, default=datetime.utcnow)
    feedback_summary = Column(String)
    
    # --- NEW FIELDS ---
    audio_filename = Column(String)  # To find the .wav file
    analysis_data = Column(Text)     # Stores the full JSON result
    # ------------------
    
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="attempts")