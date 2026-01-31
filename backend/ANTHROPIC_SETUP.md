# Anthropic Claude API 集成指南

## 概述

本项目已成功集成 Anthropic Claude API，支持使用 Claude 系列模型进行对话。

## 安装步骤

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

这将安装 `anthropic` SDK 和其他必要的依赖。

### 2. 配置 API 密钥

编辑 `backend/.env` 文件，添加你的 Anthropic API 密钥：

```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

获取 API 密钥：
1. 访问 https://console.anthropic.com/
2. 登录或注册账号
3. 在 API Keys 页面创建新的 API 密钥
4. 复制密钥并粘贴到 `.env` 文件中

### 3. 启动服务

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 使用方法

### 支持的模型

系统会根据模型名称自动选择对应的 API：

**Anthropic Claude 模型：**
- `claude-3-5-sonnet-20241022` (推荐)
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

**OpenAI 模型：**
- `gpt-4`
- `gpt-4-turbo`
- `gpt-3.5-turbo`

### API 调用示例

#### 使用 Claude 模型

```bash
curl -X POST http://localhost:8000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "message": "解释一下什么是生物医学工程",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.7
  }'
```

#### 使用 GPT 模型

```bash
curl -X POST http://localhost:8000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "message": "解释一下什么是生物医学工程",
    "model": "gpt-4",
    "temperature": 0.7
  }'
```

#### 前端调用示例

```typescript
const response = await fetch('http://localhost:8000/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: '你好，请介绍一下自己',
    model: 'claude-3-5-sonnet-20241022',  // 使用 Claude
    temperature: 0.7,
    conversationId: null,  // 可选：传入已有对话 ID
    expertId: null,        // 可选：使用特定专家配置
  }),
});

// 处理流式响应
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        console.log('Stream completed');
      } else {
        const parsed = JSON.parse(data);
        console.log(parsed.content);  // 输出每个文本片段
      }
    }
  }
}
```

## 技术实现

### 架构说明

1. **LLM 服务** (`app/services/llm.py`)
   - 统一的流式聊天接口
   - 自动根据模型名称选择 API 提供商
   - 支持 OpenAI 和 Anthropic 两种 API

2. **消息格式转换**
   - Anthropic API 要求 system 消息单独传递
   - 自动处理消息格式转换

3. **流式响应**
   - 使用 Server-Sent Events (SSE) 实现实时流式输出
   - 支持前端逐字显示响应内容

### 关键代码

```python
# 自动选择 API
if model.startswith("claude-"):
    async for chunk in self._stream_anthropic(messages, model, temperature):
        yield chunk
elif model.startswith("gpt-"):
    async for chunk in self._stream_openai(messages, model, temperature):
        yield chunk
```

## 配置选项

### ChatRequest 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| message | string | 是 | - | 用户消息内容 |
| model | string | 否 | gpt-3.5-turbo | 使用的模型名称 |
| temperature | float | 否 | 0.7 | 温度参数 (0-1) |
| conversationId | string | 否 | null | 对话 ID，用于继续已有对话 |
| expertId | string | 否 | null | 专家配置 ID |

### 环境变量

在 `backend/.env` 中配置：

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# OpenAI API (可选)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# 其他配置...
```

## 故障排查

### 问题：Anthropic client not initialized

**原因：** API 密钥未配置或配置错误

**解决方案：**
1. 检查 `.env` 文件中的 `ANTHROPIC_API_KEY` 是否正确
2. 确保 API 密钥以 `sk-ant-` 开头
3. 重启后端服务

### 问题：anthropic package not installed

**原因：** 未安装 anthropic SDK

**解决方案：**
```bash
pip install anthropic>=0.40.0
```

### 问题：模拟响应而非真实 API 调用

**原因：** API 密钥未配置或设置为 "mock"

**解决方案：**
1. 在 `.env` 文件中设置真实的 API 密钥
2. 确保密钥不是 "mock" 或空值

## 最佳实践

1. **模型选择**
   - 对于复杂任务，使用 `claude-3-5-sonnet-20241022`
   - 对于快速响应，使用 `claude-3-5-haiku-20241022`
   - 对于最高质量，使用 `claude-3-opus-20240229`

2. **温度设置**
   - 创意任务：0.8-1.0
   - 平衡任务：0.7 (默认)
   - 精确任务：0.3-0.5

3. **错误处理**
   - 始终处理流式响应中的错误消息
   - 实现重试机制处理网络问题

## 更多资源

- [Anthropic API 文档](https://docs.anthropic.com/)
- [Claude 模型对比](https://docs.anthropic.com/claude/docs/models-overview)
- [API 定价](https://www.anthropic.com/pricing)
