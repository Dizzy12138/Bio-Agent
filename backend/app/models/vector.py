from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from pgvector.sqlalchemy import Vector
from app.db.postgres import Base
from datetime import datetime
from uuid import uuid4

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    document_id = Column(String, index=True) # Linked to Mongo File ID
    chunk_index = Column(Integer)
    text = Column(Text)
    metadata_json = Column(Text, nullable=True) # JSON string for extra metadata
    embedding = Column(Vector(1536)) # OpenAI dimension
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "document_id": self.document_id,
        }
