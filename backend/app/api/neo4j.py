"""
Neo4j API 路由
提供知识图谱查询接口 — 安全加固版本
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.db.neo4j import neo4j_db
from app.api.auth import get_current_user, require_admin
from app.models.user import User
import logging
import os
import json
import re

logger = logging.getLogger(__name__)

router = APIRouter()

# Cypher 写操作关键字 — 用于拦截非只读查询
_CYPHER_WRITE_KEYWORDS = re.compile(
    r'\b(CREATE|DELETE|DETACH|SET|REMOVE|MERGE|DROP|CALL\s+\{)\b',
    re.IGNORECASE,
)

class Neo4jQueryRequest(BaseModel):
    query: str

class Neo4jQueryResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class Neo4jStatusResponse(BaseModel):
    connected: bool
    message: str
    config: Optional[Dict[str, Any]] = None

class Neo4jConfigRequest(BaseModel):
    uri: str
    username: str
    password: str


@router.get("/neo4j/status", response_model=Neo4jStatusResponse)
async def get_neo4j_status(current_user: User = Depends(get_current_user)):
    """检查Neo4j连接状态（需登录）"""
    try:
        session = neo4j_db.get_session()
        result = session.run("RETURN 1 as test")
        result.single()
        session.close()

        config = neo4j_db.get_current_config()
        return Neo4jStatusResponse(
            connected=True,
            message=f"Neo4j连接正常 (使用{config['source']}配置)",
            config=config
        )
    except Exception as e:
        config = neo4j_db.get_current_config()
        return Neo4jStatusResponse(
            connected=False,
            message=f"Neo4j连接失败: {str(e)}",
            config=config
        )

@router.post("/neo4j/query", response_model=Neo4jQueryResponse)
async def execute_neo4j_query(
    request: Neo4jQueryRequest,
    current_user: User = Depends(require_admin),
):
    """
    执行 Cypher 查询（仅管理员可用）。
    安全限制：禁止执行写操作（CREATE/DELETE/SET/REMOVE/MERGE/DROP）。
    """
    # Cypher 注入防护：拒绝写操作
    if _CYPHER_WRITE_KEYWORDS.search(request.query):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="写操作 Cypher 语句被禁止。仅允许只读查询（MATCH/RETURN）。"
        )

    try:
        session = neo4j_db.get_session()

        # 执行查询
        result = session.run(request.query)

        # 解析结果
        nodes = []
        edges = []
        node_ids = set()

        for record in result:
            for key in record.keys():
                value = record[key]

                # 处理节点
                if hasattr(value, 'id') and hasattr(value, 'labels'):
                    node_id = str(value.id)
                    if node_id not in node_ids:
                        node_ids.add(node_id)
                        properties = dict(value)
                        label = properties.get('name', properties.get('title', ''))
                        if not label and value.labels:
                            label = list(value.labels)[0]

                        nodes.append({
                            'id': node_id,
                            'label': label or f'Node-{node_id}',
                            'type': list(value.labels)[0] if value.labels else 'Unknown',
                            'properties': properties
                        })

                # 处理关系
                elif hasattr(value, 'type') and hasattr(value, 'start_node') and hasattr(value, 'end_node'):
                    start_node = value.start_node
                    end_node = value.end_node

                    start_id = str(start_node.id)
                    if start_id not in node_ids:
                        node_ids.add(start_id)
                        start_props = dict(start_node)
                        start_label = start_props.get('name', start_props.get('title', ''))
                        if not start_label and start_node.labels:
                            start_label = list(start_node.labels)[0]

                        nodes.append({
                            'id': start_id,
                            'label': start_label or f'Node-{start_id}',
                            'type': list(start_node.labels)[0] if start_node.labels else 'Unknown',
                            'properties': start_props
                        })

                    end_id = str(end_node.id)
                    if end_id not in node_ids:
                        node_ids.add(end_id)
                        end_props = dict(end_node)
                        end_label = end_props.get('name', end_props.get('title', ''))
                        if not end_label and end_node.labels:
                            end_label = list(end_node.labels)[0]

                        nodes.append({
                            'id': end_id,
                            'label': end_label or f'Node-{end_id}',
                            'type': list(end_node.labels)[0] if end_node.labels else 'Unknown',
                            'properties': end_props
                        })

                    edges.append({
                        'id': str(value.id),
                        'source': start_id,
                        'target': end_id,
                        'type': value.type,
                        'properties': dict(value)
                    })

        session.close()

        logger.info(f"Neo4j query by {current_user.username}: {len(nodes)} nodes, {len(edges)} edges")

        return Neo4jQueryResponse(nodes=nodes, edges=edges)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Neo4j query error by {current_user.username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"查询执行失败: {str(e)}")

@router.post("/neo4j/test-connection")
async def test_neo4j_connection(
    uri: str,
    username: str,
    password: str,
    database: Optional[str] = "neo4j",
    current_user: User = Depends(require_admin),
):
    """测试Neo4j连接（仅管理员可用）"""
    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(uri, auth=(username, password))
        driver.verify_connectivity()
        driver.close()
        return {"success": True, "message": "连接成功"}
    except Exception as e:
        return {"success": False, "message": f"连接失败: {str(e)}"}

@router.post("/neo4j/config/mcp")
async def set_mcp_neo4j_config(
    config: Optional[Neo4jConfigRequest] = None,
    current_user: User = Depends(require_admin),
):
    """设置使用 MCP 中的外部 Neo4j 配置（仅管理员可用）"""
    try:
        if config is None:
            mcp_uri = os.getenv('MCP_NEO4J_URI', 'bolt://180.169.229.230:51001')
            mcp_username = os.getenv('MCP_NEO4J_USERNAME', 'neo4j')
            mcp_password = os.getenv('MCP_NEO4J_PASSWORD', '')

            if not mcp_password:
                try:
                    config_file = '/usropt2429/Bio-Agent/.mcp_neo4j_config.json'
                    if os.path.exists(config_file):
                        with open(config_file, 'r') as f:
                            mcp_config = json.load(f)
                            mcp_uri = mcp_config.get('uri', mcp_uri)
                            mcp_username = mcp_config.get('username', mcp_username)
                            mcp_password = mcp_config.get('password', mcp_password)
                except Exception as e:
                    logger.warning(f"Failed to read MCP config file: {e}")

            if not mcp_password:
                return {
                    "success": False,
                    "message": "MCP Neo4j 未配置。请先运行: python config_mcp_neo4j_now.py"
                }
        else:
            mcp_uri = config.uri
            mcp_username = config.username
            mcp_password = config.password

        from neo4j import GraphDatabase
        test_driver = GraphDatabase.driver(mcp_uri, auth=(mcp_username, mcp_password))
        test_driver.verify_connectivity()
        test_driver.close()

        neo4j_db.set_mcp_config(mcp_uri, mcp_username, mcp_password)

        return {
            "success": True,
            "message": "已切换到 MCP Neo4j 配置",
            "config": neo4j_db.get_current_config()
        }
    except Exception as e:
        logger.error(f"Neo4j MCP config failed: {e}")
        return {
            "success": False,
            "message": f"配置失败: {str(e)}"
        }

@router.post("/neo4j/config/local")
async def use_local_neo4j_config(current_user: User = Depends(require_admin)):
    """切换回使用本地 Neo4j 配置（仅管理员可用）"""
    try:
        neo4j_db.use_local_config()
        return {
            "success": True,
            "message": "已切换到本地 Neo4j 配置",
            "config": neo4j_db.get_current_config()
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"切换失败: {str(e)}"
        }

@router.get("/neo4j/config/current")
async def get_current_neo4j_config(current_user: User = Depends(get_current_user)):
    """获取当前使用的 Neo4j 配置信息（需登录）"""
    return neo4j_db.get_current_config()
