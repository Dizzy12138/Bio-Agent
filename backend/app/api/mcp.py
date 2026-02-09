"""
MCP配置管理API路由
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.mcp import MCPServerConfig, MCPServerCreate, MCPServerUpdate, MCPToolConfig
from app.services.mcp_service import mcp_service
from app.api.auth import get_current_user
from app.models.user import User

router = APIRouter()

# ==================== MCP服务器管理 ====================

@router.post("/mcp/servers", response_model=MCPServerConfig)
async def create_mcp_server(
    server_create: MCPServerCreate,
    current_user: User = Depends(get_current_user)
):
    """创建MCP服务器配置"""
    server = await mcp_service.create_server(current_user.id, server_create)
    return server

@router.get("/mcp/servers", response_model=List[MCPServerConfig])
async def get_mcp_servers(
    current_user: User = Depends(get_current_user)
):
    """获取MCP服务器列表"""
    servers = await mcp_service.get_servers(current_user.id)
    return servers

@router.get("/mcp/servers/{server_id}", response_model=MCPServerConfig)
async def get_mcp_server(
    server_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取单个MCP服务器"""
    server = await mcp_service.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP服务器不存在")
    return server

@router.put("/mcp/servers/{server_id}", response_model=MCPServerConfig)
async def update_mcp_server(
    server_id: str,
    server_update: MCPServerUpdate,
    current_user: User = Depends(get_current_user)
):
    """更新MCP服务器配置"""
    server = await mcp_service.update_server(server_id, server_update)
    if not server:
        raise HTTPException(status_code=404, detail="MCP服务器不存在")
    return server

@router.delete("/mcp/servers/{server_id}")
async def delete_mcp_server(
    server_id: str,
    current_user: User = Depends(get_current_user)
):
    """删除MCP服务器"""
    success = await mcp_service.delete_server(server_id)
    if not success:
        raise HTTPException(status_code=404, detail="MCP服务器不存在")
    return {"message": "删除成功"}

@router.post("/mcp/servers/{server_id}/toggle")
async def toggle_mcp_server(
    server_id: str,
    is_enabled: bool,
    current_user: User = Depends(get_current_user)
):
    """启用/禁用MCP服务器"""
    success = await mcp_service.toggle_server(server_id, is_enabled)
    if not success:
        raise HTTPException(status_code=404, detail="MCP服务器不存在")
    return {"message": "操作成功", "is_enabled": is_enabled}

@router.post("/mcp/servers/{server_id}/connect")
async def connect_mcp_server(
    server_id: str,
    current_user: User = Depends(get_current_user)
):
    """连接MCP服务器并获取工具列表"""
    server = await mcp_service.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP服务器不存在")
    
    try:
        # TODO: 实现MCP协议连接
        # 这里需要根据connection_type调用相应的MCP客户端
        available_tools = []  # 从MCP服务器获取的工具列表
        
        await mcp_service.update_connection_status(server_id, True, available_tools)
        
        return {
            "message": "连接成功",
            "available_tools": available_tools
        }
    except Exception as e:
        await mcp_service.update_connection_status(server_id, False)
        raise HTTPException(status_code=500, detail=f"连接失败: {str(e)}")

@router.post("/mcp/servers/{server_id}/disconnect")
async def disconnect_mcp_server(
    server_id: str,
    current_user: User = Depends(get_current_user)
):
    """断开MCP服务器连接"""
    server = await mcp_service.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP服务器不存在")
    
    await mcp_service.update_connection_status(server_id, False)
    return {"message": "已断开连接"}

# ==================== MCP工具配置管理 ====================

@router.post("/mcp/tools", response_model=MCPToolConfig)
async def save_tool_config(
    tool_config: MCPToolConfig,
    current_user: User = Depends(get_current_user)
):
    """保存工具配置"""
    await mcp_service.save_tool_config(tool_config)
    return tool_config

@router.get("/mcp/tools", response_model=List[MCPToolConfig])
async def get_all_tool_configs(
    current_user: User = Depends(get_current_user)
):
    """获取所有工具配置"""
    configs = await mcp_service.get_all_tool_configs()
    return configs

@router.get("/mcp/tools/{tool_id}", response_model=MCPToolConfig)
async def get_tool_config(
    tool_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取工具配置"""
    config = await mcp_service.get_tool_config(tool_id)
    if not config:
        raise HTTPException(status_code=404, detail="工具配置不存在")
    return config

@router.delete("/mcp/tools/{tool_id}")
async def delete_tool_config(
    tool_id: str,
    current_user: User = Depends(get_current_user)
):
    """删除工具配置"""
    success = await mcp_service.delete_tool_config(tool_id)
    if not success:
        raise HTTPException(status_code=404, detail="工具配置不存在")
    return {"message": "删除成功"}

