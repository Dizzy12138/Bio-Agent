from app.db.postgres import pg_db
from app.models.vector import DocumentChunk
from sqlalchemy import select, text
import numpy as np
import random 
from typing import List

class VectorService:
    async def ingest_document(self, doc_id: str, content: str):
        """
        Slice document into chunks, generate embeddings, and store in PG.
        """
        chunks = self._chunk_text(content)
        
        async with pg_db.session_factory() as session:
            # Clear old chunks
            await session.execute(text(f"DELETE FROM document_chunks WHERE document_id = '{doc_id}'"))
            
            for i, chunk_text in enumerate(chunks):
                # Generate embedding (Mock or Real)
                embedding = await self._get_embedding(chunk_text)
                
                db_chunk = DocumentChunk(
                    document_id=doc_id,
                    chunk_index=i,
                    text=chunk_text,
                    embedding=embedding
                )
                session.add(db_chunk)
            
            await session.commit()
            print(f"Ingested {len(chunks)} chunks for doc {doc_id}")

    def _chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        # Simple char-based chunking for MVP
        return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

    async def _get_embedding(self, text: str) -> List[float]:
        # TODO: Use OpenAI/LLM Service if key exists
        # For MVP/Lite mode, return random normalized vector
        vec = np.random.rand(1536)
        return (vec / np.linalg.norm(vec)).tolist()

    async def search(self, query: str, limit: int = 5):
        query_vec = await self._get_embedding(query)
        
        async with pg_db.session_factory() as session:
            # Cosine similarity search using pgvector (<=> is L2 distance, so we order by it ASC)
            # For cosine similarity we typically use <=> on normalized vectors
            stmt = select(DocumentChunk).order_by(
                DocumentChunk.embedding.cosine_distance(query_vec)
            ).limit(limit)
            
            result = await session.execute(stmt)
            return [row[0] for row in result]

vector_service = VectorService()
