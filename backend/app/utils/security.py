"""
安全工具函数
"""

import re
from typing import Optional
from cryptography.fernet import Fernet
import base64
import hashlib
from app.core.config import settings

class SecurityUtils:
    """安全工具类"""
    
    @staticmethod
    def sanitize_regex_input(text: str) -> str:
        """
        清理正则表达式输入，防止 ReDoS 攻击
        
        Args:
            text: 用户输入的文本
            
        Returns:
            清理后的文本
        """
        # 转义特殊字符
        special_chars = r'[\^$.|?*+(){}[]'
        for char in special_chars:
            text = text.replace(char, f'\\{char}')
        return text
    
    @staticmethod
    def validate_api_key_format(api_key: str, provider: str) -> bool:
        """
        验证 API Key 格式
        
        Args:
            api_key: API Key
            provider: 提供商 (openai, anthropic, gemini, deepseek)
            
        Returns:
            是否有效
        """
        patterns = {
            'openai': r'^sk-[a-zA-Z0-9]{32,}$',
            'anthropic': r'^sk-ant-[a-zA-Z0-9\-]{32,}$',
            'gemini': r'^[a-zA-Z0-9\-_]{32,}$',
            'deepseek': r'^[a-zA-Z0-9\-_]{32,}$',
        }
        
        pattern = patterns.get(provider.lower())
        if not pattern:
            return False
        
        return bool(re.match(pattern, api_key))
    
    @staticmethod
    def mask_api_key(api_key: str) -> str:
        """
        遮蔽 API Key，只显示前后几位
        
        Args:
            api_key: 完整的 API Key
            
        Returns:
            遮蔽后的 API Key
        """
        if not api_key or len(api_key) < 8:
            return "***"
        
        return f"{api_key[:4]}...{api_key[-4:]}"


class APIKeyEncryption:
    """API Key 加密工具"""
    
    def __init__(self):
        """初始化加密器"""
        # 从配置获取加密密钥，如果没有则生成一个
        if settings.API_KEY_ENCRYPTION_KEY:
            key = settings.API_KEY_ENCRYPTION_KEY.encode()
        else:
            # 使用 SECRET_KEY 派生加密密钥
            key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        
        # 确保密钥是 base64 编码的 32 字节
        self.fernet = Fernet(base64.urlsafe_b64encode(key))
    
    def encrypt(self, api_key: str) -> str:
        """
        加密 API Key
        
        Args:
            api_key: 明文 API Key
            
        Returns:
            加密后的 API Key (base64 编码)
        """
        if not api_key:
            return ""
        
        encrypted = self.fernet.encrypt(api_key.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt(self, encrypted_key: str) -> str:
        """
        解密 API Key
        
        Args:
            encrypted_key: 加密的 API Key
            
        Returns:
            明文 API Key
        """
        if not encrypted_key:
            return ""
        
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_key.encode())
            decrypted = self.fernet.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception:
            return ""


# 全局加密器实例
api_key_encryptor = APIKeyEncryption()


def sanitize_mongo_query(query: dict) -> dict:
    """
    清理 MongoDB 查询，防止注入攻击
    
    Args:
        query: 原始查询字典
        
    Returns:
        清理后的查询字典
    """
    # 移除危险的操作符
    dangerous_operators = ['$where', '$function', '$accumulator', '$expr']
    
    def clean_dict(d: dict) -> dict:
        cleaned = {}
        for key, value in d.items():
            # 检查危险操作符
            if key in dangerous_operators:
                continue
            
            # 递归清理嵌套字典
            if isinstance(value, dict):
                cleaned[key] = clean_dict(value)
            elif isinstance(value, list):
                cleaned[key] = [clean_dict(item) if isinstance(item, dict) else item for item in value]
            else:
                cleaned[key] = value
        
        return cleaned
    
    return clean_dict(query)

