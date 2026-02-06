from neo4j import GraphDatabase
from app.core.config import settings
from typing import Optional
import os
import json

class Neo4jDB:
    driver = None
    _use_mcp = False
    _mcp_config = None
    _mongodb_loaded = False
    
    def __init__(self):
        """初始化时自动加载 MCP 配置"""
        self._load_mcp_config_on_startup()
    
    def _load_from_mongodb(self) -> bool:
        """从 MongoDB 加载 Neo4j MCP 配置"""
        try:
            from pymongo import MongoClient
            
            # 连接 MongoDB
            client = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
            db = client[settings.MONGODB_DB_NAME]
            
            # 查找启用的 Neo4j MCP 服务器配置
            mcp_server = db.mcp_servers.find_one({
                "name": {"$regex": "Neo4j", "$options": "i"},
                "is_enabled": True
            })
            
            if mcp_server:
                # 从 env 字段提取配置
                env = mcp_server.get('env', {})
                uri = env.get('NEO4J_URI') or env.get('uri')
                username = env.get('NEO4J_USERNAME') or env.get('username')
                password = env.get('NEO4J_PASSWORD') or env.get('password')
                
                # 如果 env 中没有，尝试从 auth_config 中获取
                if not all([uri, username, password]):
                    auth_config = mcp_server.get('auth_config', {})
                    uri = uri or auth_config.get('uri')
                    username = username or auth_config.get('username')
                    password = password or auth_config.get('password')
                
                # 如果还是没有，尝试从 url 字段获取
                if not uri and mcp_server.get('url'):
                    uri = mcp_server.get('url')
                
                if uri and username and password:
                    print(f"✓ 从 MongoDB 加载 MCP Neo4j 配置: {uri}")
                    self._use_mcp = True
                    self._mcp_config = {
                        'uri': uri,
                        'username': username,
                        'password': password
                    }
                    self._mongodb_loaded = True
                    client.close()
                    return True
            
            client.close()
            return False
            
        except Exception as e:
            print(f"⚠️  从 MongoDB 加载配置失败: {e}")
            return False
    
    def _load_mcp_config_on_startup(self):
        """启动时自动加载 MCP Neo4j 配置"""
        try:
            # 1. 尝试从 MongoDB 读取（最高优先级）
            if self._load_from_mongodb():
                return
            
            # 2. 尝试从配置文件读取
            config_file = '/usropt2429/Bio-Agent/.mcp_neo4j_config.json'
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    uri = config.get('uri')
                    username = config.get('username')
                    password = config.get('password')
                    
                    if uri and username and password:
                        print(f"✓ 从配置文件加载 MCP Neo4j 配置: {uri}")
                        self._use_mcp = True
                        self._mcp_config = {
                            'uri': uri,
                            'username': username,
                            'password': password
                        }
                        return
            
            # 3. 尝试从环境变量读取
            mcp_uri = os.getenv('MCP_NEO4J_URI')
            mcp_username = os.getenv('MCP_NEO4J_USERNAME')
            mcp_password = os.getenv('MCP_NEO4J_PASSWORD')
            
            if mcp_uri and mcp_username and mcp_password:
                print(f"✓ 从环境变量加载 MCP Neo4j 配置: {mcp_uri}")
                self._use_mcp = True
                self._mcp_config = {
                    'uri': mcp_uri,
                    'username': mcp_username,
                    'password': mcp_password
                }
                return
            
            # 4. 没有 MCP 配置，使用本地配置
            print("ℹ️  未找到 MCP Neo4j 配置，将使用本地 Neo4j")
            
        except Exception as e:
            print(f"⚠️  加载 MCP 配置失败: {e}，将使用本地 Neo4j")

    def set_mcp_config(self, uri: str, username: str, password: str):
        """设置使用 MCP 中的外部 Neo4j 配置"""
        self._use_mcp = True
        self._mcp_config = {
            'uri': uri,
            'username': username,
            'password': password
        }
        # 如果已有连接，关闭并重新连接
        if self.driver:
            self.close()
            self.connect()

    def use_local_config(self):
        """切换回使用本地 Neo4j 配置"""
        self._use_mcp = False
        self._mcp_config = None
        # 如果已有连接，关闭并重新连接
        if self.driver:
            self.close()
            self.connect()

    def connect(self):
        """连接到 Neo4j（优先使用 MCP 配置）"""
        if self._use_mcp and self._mcp_config:
            # 使用 MCP 配置
            uri = self._mcp_config['uri']
            username = self._mcp_config['username']
            password = self._mcp_config['password']
            print(f"Connecting to Neo4j via MCP: {uri}")
        else:
            # 使用本地配置
            uri = settings.NEO4J_URI
            username = settings.NEO4J_USER
            password = settings.NEO4J_PASSWORD
            print(f"Connecting to local Neo4j: {uri}")
        
        self.driver = GraphDatabase.driver(
            uri,
            auth=(username, password),
            connection_timeout=5,
        )
        
        # Verify connection
        try:
            self.driver.verify_connectivity()
            print("✓ Connected to Neo4j")
        except Exception as e:
            print(f"✗ Failed to connect to Neo4j: {e}")
            raise

    def close(self):
        if self.driver:
            self.driver.close()
            print("Closed Neo4j connection")

    def get_session(self):
        if not self.driver:
            self.connect()
        return self.driver.session()
    
    def get_current_config(self) -> dict:
        """获取当前使用的配置信息"""
        if self._use_mcp and self._mcp_config:
            return {
                'source': 'mcp_mongodb' if self._mongodb_loaded else 'mcp',
                'uri': self._mcp_config['uri'],
                'username': self._mcp_config['username']
            }
        else:
            return {
                'source': 'local',
                'uri': settings.NEO4J_URI,
                'username': settings.NEO4J_USER
            }

neo4j_db = Neo4jDB()
