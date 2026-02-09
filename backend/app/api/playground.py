"""
抽取演练场API路由
"""

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import List
from app.models.playground import (
    PlaygroundSession, PlaygroundSessionCreate, PlaygroundSessionUpdate,
    PlaygroundDocument, PlaygroundMessage, PlaygroundExtractedRow
)
from app.services.playground_service import playground_service
from app.api.auth import get_current_user
from app.models.user import User
from uuid import uuid4
from datetime import datetime
import base64

router = APIRouter()

# ==================== 会话管理 ====================

@router.post("/playground/sessions", response_model=PlaygroundSession)
async def create_session(
    session_create: PlaygroundSessionCreate,
    current_user: User = Depends(get_current_user)
):
    """创建新会话"""
    session = await playground_service.create_session(current_user.id, session_create)
    return session

@router.get("/playground/sessions", response_model=List[PlaygroundSession])
async def get_sessions(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    include_archived: bool = False,
    current_user: User = Depends(get_current_user)
):
    """获取会话列表"""
    sessions = await playground_service.get_sessions(
        current_user.id, 
        limit=limit, 
        skip=skip,
        include_archived=include_archived
    )
    return sessions

@router.get("/playground/sessions/{session_id}", response_model=PlaygroundSession)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取单个会话"""
    session = await playground_service.get_session(session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    return session

@router.put("/playground/sessions/{session_id}", response_model=PlaygroundSession)
async def update_session(
    session_id: str,
    session_update: PlaygroundSessionUpdate,
    current_user: User = Depends(get_current_user)
):
    """更新会话"""
    session = await playground_service.update_session(
        session_id, 
        current_user.id, 
        session_update
    )
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    return session

@router.delete("/playground/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """删除会话"""
    success = await playground_service.delete_session(session_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="会话不存在")
    return {"message": "删除成功"}

@router.post("/playground/sessions/{session_id}/archive")
async def archive_session(
    session_id: str,
    is_archived: bool,
    current_user: User = Depends(get_current_user)
):
    """归档/取消归档会话"""
    success = await playground_service.archive_session(session_id, current_user.id, is_archived)
    if not success:
        raise HTTPException(status_code=404, detail="会话不存在")
    return {"message": "操作成功"}

# ==================== 文档管理 ====================

@router.post("/playground/sessions/{session_id}/documents")
async def upload_document(
    session_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """上传文档"""
    # 验证会话存在
    session = await playground_service.get_session(session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    # 读取文件内容
    content = await file.read()
    
    # 确定文件类型
    file_type = "text"
    if file.content_type:
        if "image" in file.content_type:
            file_type = "image"
        elif "pdf" in file.content_type:
            file_type = "pdf"
    
    # 创建文档对象
    document = PlaygroundDocument(
        id=f"doc-{uuid4().hex[:12]}",
        name=file.filename or "未命名文档",
        type=file_type,
        url=f"data:{file.content_type};base64,{base64.b64encode(content).decode()}",
        file_size=len(content),
        uploaded_at=datetime.now()
    )
    
    # 添加到会话
    success = await playground_service.add_document(session_id, current_user.id, document)
    if not success:
        raise HTTPException(status_code=500, detail="文档上传失败")
    
    return document

@router.delete("/playground/sessions/{session_id}/documents/{document_id}")
async def remove_document(
    session_id: str,
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """移除文档"""
    success = await playground_service.remove_document(session_id, current_user.id, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="文档不存在")
    return {"message": "删除成功"}

# ==================== 消息管理 ====================

@router.post("/playground/sessions/{session_id}/messages")
async def add_message(
    session_id: str,
    message: PlaygroundMessage,
    current_user: User = Depends(get_current_user)
):
    """添加消息"""
    success = await playground_service.add_message(session_id, current_user.id, message)
    if not success:
        raise HTTPException(status_code=404, detail="会话不存在")
    return message

# ==================== 数据提取 ====================

@router.put("/playground/sessions/{session_id}/extracted-data")
async def update_extracted_data(
    session_id: str,
    extracted_rows: List[PlaygroundExtractedRow],
    current_user: User = Depends(get_current_user)
):
    """更新提取的数据"""
    success = await playground_service.update_extracted_data(
        session_id, 
        current_user.id, 
        extracted_rows
    )
    if not success:
        raise HTTPException(status_code=404, detail="会话不存在")
    return {"message": "数据更新成功"}

@router.post("/playground/sessions/{session_id}/extract")
async def extract_data(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """执行数据提取（调用Agent）"""
    session = await playground_service.get_session(session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    # TODO: 实现Agent调用逻辑
    # 1. 获取文档内容
    # 2. 根据schema调用LLM提取数据
    # 3. 返回提取结果
    
    return {
        "message": "数据提取功能待实现",
        "session_id": session_id
    }

