from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class UploadFileRecord(BaseModel):
    id: str  # UUID
    filename: str
    originalName: str
    contentType: str
    size: int
    path: str
    md5: Optional[str] = None
    createdAt: datetime = datetime.now()
    uploadedBy: Optional[str] = "system"

class OCRTask(BaseModel):
    id: str
    fileId: str
    status: TaskStatus
    progress: int = 0
    error: Optional[str] = None
    result: Optional[dict] = None  # Store simple result or ref to detailed result
    createdAt: datetime = datetime.now()
    updatedAt: datetime = datetime.now()
    
    # MinerU params
    options: Optional[dict] = None 
