"""
MCP配置管理服务
"""

from app.db.mongo import mongodb
from app.models.mcp import MCPServerConfig, MCPServerCreate, MCPServerUpdate, MCPToolConfig
from typing import List, Optional
from datetime import datetime
from uuid import uuid4

class MCPService:
    def collection(self):
        return mongodb.db["mcp_servers"]
    
    def tool_collection(self):
        return mongodb.db["mcp_tools"]

    async def create_server(self, user_id: str, server_create: MCPServerCreate) -> MCPServerConfig:
        """创建MCP服务器配置"""
        server = MCPServerConfig(
            id=f"mcp-{uuid4().hex[:12]}",
            name=server_create.name,
            description=server_create.description,
            connection_type=server_create.connection_type,
            command=server_create.command,
            args=server_create.args,
            env=server_create.env,
            url=server_create.url,
            auth_type=server_create.auth_type,
            auth_config=server_create.auth_config,
            is_enabled=True,
            is_connected=False,
            available_tools=[],
            created_at=datetime.now(),
            updated_at=datetime.now(),
            created_by=user_id
        )
        
        await self.collection().insert_one(server.model_dump())
        return server

    async def get_servers(self, user_id: Optional[str] = None) -> List[MCPServerConfig]:
        """获取MCP服务器列表"""
        query = {}
        if user_id:
            query["created_by"] = user_id
        
        cursor = self.collection().find(query).sort("created_at", -1)
        servers = []
        async for doc in cursor:
            servers.append(MCPServerConfig(**doc))
        return servers

    async def get_server(self, server_id: str) -> Optional[MCPServerConfig]:
        """获取单个MCP服务器"""
        doc = await self.collection().find_one({"id": server_id})
        if doc:
            return MCPServerConfig(**doc)
        return None

    async def update_server(
        self, 
        server_id: str, 
        server_update: MCPServerUpdate
    ) -> Optional[MCPServerConfig]:
        """更新MCP服务器配置"""
        update_data = server_update.model_dump(exclude_unset=True)
        if not update_data:
            return await self.get_server(server_id)
        
        update_data["updated_at"] = datetime.now()
        
        result = await self.collection().update_one(
            {"id": server_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_server(server_id)
        return None

    async def delete_server(self, server_id: str) -> bool:
        """删除MCP服务器"""
        result = await self.collection().delete_one({"id": server_id})
        return result.deleted_count > 0

    async def toggle_server(self, server_id: str, is_enabled: bool) -> bool:
        """启用/禁用MCP服务器"""
        result = await self.collection().update_one(
            {"id": server_id},
            {"$set": {"is_enabled": is_enabled, "updated_at": datetime.now()}}
        )
        return result.modified_count > 0

    async def update_connection_status(
        self, 
        server_id: str, 
        is_connected: bool,
        available_tools: Optional[List[str]] = None
    ) -> bool:
        """更新连接状态"""
        update_data = {
            "is_connected": is_connected,
            "updated_at": datetime.now()
        }
        
        if is_connected:
            update_data["last_connected"] = datetime.now()
        
        if available_tools is not None:
            update_data["available_tools"] = available_tools
        
        result = await self.collection().update_one(
            {"id": server_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    # ==================== 工具配置管理 ====================

    async def save_tool_config(self, tool_config: MCPToolConfig) -> bool:
        """保存工具配置"""
        await self.tool_collection().replace_one(
            {"tool_id": tool_config.tool_id},
            tool_config.model_dump(),
            upsert=True
        )
        return True

    async def get_tool_config(self, tool_id: str) -> Optional[MCPToolConfig]:
        """获取工具配置"""
        doc = await self.tool_collection().find_one({"tool_id": tool_id})
        if doc:
            return MCPToolConfig(**doc)
        return None

    async def get_all_tool_configs(self) -> List[MCPToolConfig]:
        """获取所有工具配置"""
        cursor = self.tool_collection().find()
        configs = []
        async for doc in cursor:
            configs.append(MCPToolConfig(**doc))
        return configs

    async def delete_tool_config(self, tool_id: str) -> bool:
        """删除工具配置"""
        result = await self.tool_collection().delete_one({"tool_id": tool_id})
        return result.deleted_count > 0

mcp_service = MCPService()

