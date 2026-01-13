---
description: 如何开发新的专家模块功能
---

# 专家模块开发工作流

## 1. 添加新专家类型

// turbo
1. 编辑 `src/features/experts/types.ts`，添加新的领域或能力标签

2. 在 `ExpertManager.tsx` 的 `mockExperts` 中添加新的系统专家

3. 更新 `ExpertEditModal.tsx` 中的 `AVAILABLE_TOOLS` 和 `AVAILABLE_KNOWLEDGE_BASES` 如果需要

## 2. 添加新工具

1. 在 `ExpertEditModal.tsx` 的 `AVAILABLE_TOOLS` 数组中添加工具定义：
   ```typescript
   { id: 'tool-id', name: '工具名称', icon: '🔧', description: '工具描述' }
   ```

2. 在 `ChatInterface.tsx` 的 `generateToolCalls` 函数中添加对应的模拟调用

## 3. 添加新知识库

1. 在 `ExpertEditModal.tsx` 的 `AVAILABLE_KNOWLEDGE_BASES` 数组中添加：
   ```typescript
   { id: 'kb-id', name: '知识库名称', icon: '📚', docCount: 1000 }
   ```

## 4. 测试专家功能

// turbo
1. 运行开发服务器: `npm run dev`

2. 访问 http://localhost:5174

3. 点击"专家管理"菜单

4. 测试创建、查看、编辑功能

## 5. 样式调整

样式文件位置：
- 专家管理: `src/features/experts/ExpertManager.css`
- 对话界面: `src/features/chat/ChatInterface.css`
- 对话历史: `src/features/chat/components/ChatHistory.css`
