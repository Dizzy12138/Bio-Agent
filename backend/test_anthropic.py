#!/usr/bin/env python3
"""
测试 Anthropic API 集成
运行此脚本前请确保：
1. 已安装依赖：pip install -r requirements.txt
2. 已配置 .env 文件中的 ANTHROPIC_API_KEY
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.llm import llm_service

async def test_anthropic():
    """测试 Anthropic Claude API"""
    print("=" * 60)
    print("测试 Anthropic Claude API 集成")
    print("=" * 60)
    
    # 初始化服务
    await llm_service.start()
    
    # 测试消息
    messages = [
        {"role": "system", "content": "你是一个友好的助手。"},
        {"role": "user", "content": "请用一句话介绍你自己。"}
    ]
    
    # 测试 Claude 模型
    print("\n测试 Claude 3.5 Sonnet:")
    print("-" * 60)
    try:
        full_response = ""
        async for chunk in llm_service.stream_chat(
            messages, 
            model="claude-3-5-sonnet-20241022",
            temperature=0.7
        ):
            print(chunk, end="", flush=True)
            full_response += chunk
        print("\n" + "-" * 60)
        print(f"✓ Claude 测试成功！响应长度: {len(full_response)} 字符")
    except Exception as e:
        print(f"\n✗ Claude 测试失败: {e}")
    
    # 测试 GPT 模型（如果配置了）
    print("\n\n测试 GPT-3.5-turbo:")
    print("-" * 60)
    try:
        full_response = ""
        async for chunk in llm_service.stream_chat(
            messages, 
            model="gpt-3.5-turbo",
            temperature=0.7
        ):
            print(chunk, end="", flush=True)
            full_response += chunk
        print("\n" + "-" * 60)
        print(f"✓ GPT 测试成功！响应长度: {len(full_response)} 字符")
    except Exception as e:
        print(f"\n✗ GPT 测试失败: {e}")
    
    # 关闭服务
    await llm_service.stop()
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_anthropic())
