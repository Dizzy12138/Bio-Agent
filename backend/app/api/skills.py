"""
技能管理API路由
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.skill_db import SkillConfig, SkillExecutionConfig
from app.services.skill_db import skill_service
from app.api.auth import get_current_user
from app.models.user import User
from datetime import datetime

router = APIRouter()

@router.get("/skills", response_model=List[SkillConfig])
async def get_all_skills(
    enabled_only: bool = Query(False, description="只返回已启用的技能"),
    current_user: User = Depends(get_current_user)
):
    """获取所有技能"""
    skills = await skill_service.get_all_skills()
    if enabled_only:
        skills = [s for s in skills if s.enabled]
    return skills

@router.get("/skills/{skill_id}", response_model=SkillConfig)
async def get_skill(
    skill_id: str,
    current_user: User = Depends(get_current_user)
):
    """获取单个技能"""
    skill = await skill_service.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="技能不存在")
    return skill

@router.post("/skills", response_model=SkillConfig)
async def create_skill(
    skill: SkillConfig,
    current_user: User = Depends(get_current_user)
):
    """创建新技能"""
    # 检查是否已存在
    existing = await skill_service.get_skill(skill.id)
    if existing:
        raise HTTPException(status_code=400, detail="技能ID已存在")
    
    skill.createdAt = datetime.now()
    skill.updatedAt = datetime.now()
    await skill_service.update_skill(skill)
    return skill

@router.put("/skills/{skill_id}", response_model=SkillConfig)
async def update_skill(
    skill_id: str,
    skill: SkillConfig,
    current_user: User = Depends(get_current_user)
):
    """更新技能"""
    existing = await skill_service.get_skill(skill_id)
    if not existing:
        raise HTTPException(status_code=404, detail="技能不存在")
    
    skill.id = skill_id
    skill.updatedAt = datetime.now()
    await skill_service.update_skill(skill)
    return skill

@router.delete("/skills/{skill_id}")
async def delete_skill(
    skill_id: str,
    current_user: User = Depends(get_current_user)
):
    """删除技能（仅限自定义技能）"""
    skill = await skill_service.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="技能不存在")
    
    if skill.type == "native":
        raise HTTPException(status_code=400, detail="不能删除系统内置技能")
    
    await skill_service.collection().delete_one({"id": skill_id})
    return {"message": "删除成功"}

@router.post("/skills/{skill_id}/toggle")
async def toggle_skill(
    skill_id: str,
    enabled: bool,
    current_user: User = Depends(get_current_user)
):
    """启用/禁用技能"""
    skill = await skill_service.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="技能不存在")
    
    await skill_service.toggle_skill(skill_id, enabled)
    return {"message": "操作成功", "enabled": enabled}

@router.post("/skills/{skill_id}/execute")
async def execute_skill(
    skill_id: str,
    params: dict,
    current_user: User = Depends(get_current_user)
):
    """执行技能"""
    skill = await skill_service.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="技能不存在")
    
    if not skill.enabled:
        raise HTTPException(status_code=400, detail="技能未启用")
    
    # 检查是否需要审批
    if skill.executionConfig.requiresApproval:
        # TODO: 实现审批流程
        raise HTTPException(status_code=403, detail="该技能需要审批后才能执行")
    
    # 执行技能
    try:
        if skill.type == "native":
            result = await execute_native_skill(skill.name, params)
        elif skill.type == "mcp":
            result = await execute_mcp_skill(skill, params)
        elif skill.type == "api":
            result = await execute_api_skill(skill, params)
        else:
            raise HTTPException(status_code=400, detail="不支持的技能类型")
        
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"技能执行失败: {str(e)}")

@router.get("/skills/tool-definitions")
async def get_tool_definitions(
    enabled_only: bool = True,
    current_user: User = Depends(get_current_user)
):
    """获取OpenAI工具定义格式"""
    skills = await skill_service.get_all_skills()
    if enabled_only:
        skills = [s for s in skills if s.enabled]
    
    tools = [skill.to_tool_definition() for skill in skills]
    return {"tools": tools}

# ==================== 技能执行函数 ====================

async def execute_native_skill(skill_name: str, params: dict):
    """执行原生技能"""
    if skill_name == "web_search":
        query = params.get("query", "")
        # TODO: 实现网络搜索
        return {"results": [f"搜索结果: {query}"]}
    
    elif skill_name == "calculator":
        expression = params.get("expression", "")
        try:
            result = eval(expression)  # 注意：生产环境需要使用安全的表达式求值
            return {"result": result}
        except Exception as e:
            raise ValueError(f"计算错误: {str(e)}")
    
    elif skill_name == "get_current_time":
        from datetime import datetime
        return {"time": datetime.now().isoformat()}
    
    else:
        raise ValueError(f"未知的原生技能: {skill_name}")

async def execute_mcp_skill(skill: SkillConfig, params: dict):
    """执行MCP技能"""
    # TODO: 实现MCP协议调用
    mcp_server_id = skill.executionConfig.mcpServerId
    original_tool_name = skill.executionConfig.originalToolName
    
    # 这里需要调用MCP客户端
    return {"message": "MCP技能执行（待实现）", "params": params}

async def execute_api_skill(skill: SkillConfig, params: dict):
    """执行API技能"""
    import httpx
    
    api_config = skill.executionConfig.apiConfig
    if not api_config:
        raise ValueError("API配置缺失")
    
    url = api_config.get("url")
    method = api_config.get("method", "POST").upper()
    headers = api_config.get("headers", {})
    
    async with httpx.AsyncClient() as client:
        if method == "GET":
            response = await client.get(url, params=params, headers=headers)
        elif method == "POST":
            response = await client.post(url, json=params, headers=headers)
        elif method == "PUT":
            response = await client.put(url, json=params, headers=headers)
        elif method == "DELETE":
            response = await client.delete(url, params=params, headers=headers)
        else:
            raise ValueError(f"不支持的HTTP方法: {method}")
        
        response.raise_for_status()
        return response.json()
