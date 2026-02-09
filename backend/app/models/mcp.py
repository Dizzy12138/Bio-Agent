"""
MCP配置模型（扩展版）
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class MCPToolConfig(BaseModel):
    """MCP工具配置"""
    tool_id: str
    enabled: bool = True
    config: Dict[str, Any] = {}
    added_at: datetime = Field(default_factory=datetime.now)

class MCPServerConfig(BaseModel):
    """MCP服务器配置"""
    id: str
    name: str
    description: Optional[str] = None
    
    # 连接配置
    connection_type: str  # 'stdio' | 'http' | 'websocket'
    command: Optional[str] = None  # For stdio
    args: List[str] = []
    env: Dict[str, str] = {}
    url: Optional[str] = None  # For http/websocket
    
    # 认证
    auth_type: Optional[str] = None  # 'none' | 'api_key' | 'oauth'
    auth_config: Dict[str, Any] = {}
    
    # 状态
    is_enabled: bool = True
    is_connected: bool = False
    last_connected: Optional[datetime] = None
    
    # 工具列表
    available_tools: List[str] = []
    
    # 元数据
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[str] = None

class MCPServerCreate(BaseModel):
    name: str
    description: Optional[str] = None
    connection_type: str
    command: Optional[str] = None
    args: List[str] = []
    env: Dict[str, str] = {}
    url: Optional[str] = None
    auth_type: Optional[str] = None
    auth_config: Dict[str, Any] = {}

class MCPServerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    url: Optional[str] = None
    auth_type: Optional[str] = None
    auth_config: Optional[Dict[str, Any]] = None
    is_enabled: Optional[bool] = None

