"""
安全工具测试
"""

import pytest
from app.utils.security import SecurityUtils, APIKeyEncryption, sanitize_mongo_query

def test_sanitize_regex_input():
    """测试正则表达式输入清理"""
    # 测试特殊字符转义
    assert SecurityUtils.sanitize_regex_input("test.*") == "test\\.\\*"
    assert SecurityUtils.sanitize_regex_input("a+b") == "a\\+b"
    assert SecurityUtils.sanitize_regex_input("(test)") == "\\(test\\)"
    
    # 测试正常输入
    assert SecurityUtils.sanitize_regex_input("normal text") == "normal text"

def test_validate_api_key_format():
    """测试 API Key 格式验证"""
    # OpenAI
    assert SecurityUtils.validate_api_key_format("sk-1234567890abcdefghijklmnopqrstuvwxyz", "openai")
    assert not SecurityUtils.validate_api_key_format("invalid-key", "openai")
    
    # Anthropic
    assert SecurityUtils.validate_api_key_format("sk-ant-1234567890abcdefghijklmnopqrstuvwxyz", "anthropic")
    assert not SecurityUtils.validate_api_key_format("sk-1234", "anthropic")

def test_mask_api_key():
    """测试 API Key 遮蔽"""
    key = "sk-1234567890abcdefghijklmnopqrstuvwxyz"
    masked = SecurityUtils.mask_api_key(key)
    
    assert masked.startswith("sk-1")
    assert masked.endswith("wxyz")
    assert "..." in masked
    assert len(masked) < len(key)
    
    # 测试短密钥
    assert SecurityUtils.mask_api_key("short") == "***"
    assert SecurityUtils.mask_api_key("") == "***"

def test_api_key_encryption():
    """测试 API Key 加密解密"""
    encryptor = APIKeyEncryption()
    
    original_key = "sk-test1234567890abcdefghijklmnopqrstuvwxyz"
    
    # 加密
    encrypted = encryptor.encrypt(original_key)
    assert encrypted != original_key
    assert len(encrypted) > 0
    
    # 解密
    decrypted = encryptor.decrypt(encrypted)
    assert decrypted == original_key
    
    # 测试空字符串
    assert encryptor.encrypt("") == ""
    assert encryptor.decrypt("") == ""

def test_sanitize_mongo_query():
    """测试 MongoDB 查询清理"""
    # 测试移除危险操作符
    dangerous_query = {
        "name": "test",
        "$where": "this.name == 'test'",
        "$function": "malicious code"
    }
    
    cleaned = sanitize_mongo_query(dangerous_query)
    
    assert "name" in cleaned
    assert "$where" not in cleaned
    assert "$function" not in cleaned
    
    # 测试嵌套字典
    nested_query = {
        "filter": {
            "$where": "bad",
            "safe": "good"
        }
    }
    
    cleaned_nested = sanitize_mongo_query(nested_query)
    assert cleaned_nested["filter"]["safe"] == "good"
    assert "$where" not in cleaned_nested["filter"]
    
    # 测试数组
    array_query = {
        "$or": [
            {"name": "test"},
            {"$where": "bad"}
        ]
    }
    
    cleaned_array = sanitize_mongo_query(array_query)
    assert len(cleaned_array["$or"]) == 2
    assert "name" in cleaned_array["$or"][0]

