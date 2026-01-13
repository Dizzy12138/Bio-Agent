# BioMed Agent 前端开发任务

> 最后更新：2026-01-07

## 📋 项目概述

BioMed Agent 是一个面向生物医学领域的 AI Agent 平台前端，支持专家管理、智能对话、知识库管理等功能。

---

## ✅ 已完成功能

### Phase 1: 基础架构与工作流模块 (已完成)

- [x] 项目初始化 (Vite + React + TypeScript)
- [x] 设计系统和全局样式
- [x] 通用组件库 (Button, Input, Card 等)
- [x] 侧边栏导航组件
- [x] 工作流画布 (React Flow 集成)
- [x] 自定义节点类型 (Query, Polymer, Compare, Evaluate 等)
- [x] 工作流保存/加载/版本管理
- [x] 执行面板与执行历史
- [x] React Portal 修复模态框定位问题

### Phase 2: 专家 Agent 管理模块 (已完成)

- [x] **ExpertManager** - 专家管理主组件
- [x] **ExpertList** - 专家列表面板，支持搜索和筛选
- [x] **ExpertCreation** - 对话式专家创建流程
  - [x] 多步骤引导创建
  - [x] 领域和能力标签选择
  - [x] 头像选择
  - [x] 系统提示词编辑
  - [x] 预览确认
- [x] **ExpertDetail** - 专家详情查看
  - [x] 使用统计
  - [x] 能力标签
  - [x] 关联工具
  - [x] 系统提示词
  - [x] 创建时间元数据
- [x] **ExpertEditModal** - 专家编辑模态框
  - [x] 基本信息编辑
  - [x] 能力标签编辑
  - [x] 可用工具配置
  - [x] 知识库关联 ⭐
  - [x] 提示词编辑
- [x] 类型定义 (Expert, ExpertCreationStep 等)
- [x] 导航更新 (替换工作流入口)

### Phase 3: 对话界面增强 (已完成)

- [x] **专家选择器** - 右上角切换专家下拉菜单
- [x] **@提及功能** - 输入 @ 调用特定专家
- [x] **专家专属响应** - 不同专家返回不同风格回答
- [x] **动态占位符** - 根据当前专家状态变化

### Phase 4: 对话历史管理 (已完成)

- [x] **ChatHistory** - 对话历史侧边栏
  - [x] 历史触发按钮 (时钟图标)
  - [x] 搜索对话功能
  - [x] 按时间分组 (今天/昨天/本周/更早)
  - [x] 按专家分组
  - [x] 置顶/取消置顶
  - [x] 删除对话
- [x] **chatStore 增强**
  - [x] 对话创建/更新/删除
  - [x] 专家上下文追踪
  - [x] 自动生成对话标题
  - [x] localStorage 持久化
- [x] **类型扩展**
  - [x] Message 添加专家字段
  - [x] Conversation 添加专家关联
  - [x] ChatHistoryGroup 类型

### Phase 5: 专家模板系统 (已完成) ⭐ NEW

- [x] **TemplateGallery** - 模板库弹窗
  - [x] 热门模板展示
  - [x] 分类筛选 (医学临床/科研分析/材料科学/文献综述/数据分析)
  - [x] 搜索功能
  - [x] 模板预览面板
- [x] **模板定义** (`templates.ts`)
  - [x] 12个预设专家模板
  - [x] 模板类型和分类定义
  - [x] 辅助函数 (搜索/按类别/按热度)
- [x] **一键创建** - 从模板快速创建专家
- [x] 集成到ExpertList入口按钮

### Phase 6: 专家分享与导入/导出 (已完成) ⭐ NEW

- [x] **ExportImportModal** - 导入导出模态框
  - [x] 下载文件标签页
  - [x] 分享链接标签页
  - [x] JSON 格式导出
  - [x] Markdown 格式导出
  - [x] 分享链接生成
- [x] **导出工具函数** (`exportImport.ts`)
  - [x] 验证导入数据
  - [x] 文件下载/上传
  - [x] 链接编码/解码
- [x] 集成到专家详情页"导出"按钮

---

## 🚧 待开发功能

### Phase 7: 对话功能增强 (进行中)

- [x] **对话导出** ⭐ NEW
  - [x] Markdown 格式导出
  - [x] HTML 格式导出 (可打印为 PDF)
  - [x] 纯文本格式导出
  - [x] JSON 格式导出 (可导入恢复)
  - [x] ConversationExportModal 组件
- [x] **对话标注和收藏** ⭐ NEW
  - [x] 收藏对话功能
  - [x] 标签系统 (6种预设标签)
  - [x] 标签可视化显示
  - [x] 收藏分组显示
- [ ] 对话分支 (Fork 功能)
- [ ] 多轮对话上下文管理优化
- [ ] 流式响应实现

### Phase 8: 知识库管理模块 (进行中)

- [x] **外接API架构设计** ⭐ NEW
  - [x] knowledgeAPI.ts - API服务层 (支持外接平台)
  - [x] knowledgeStore.ts - 状态管理
  - [x] APIConfigModal - API配置模态框
  - [x] 连接状态显示
  - [x] Mock数据支持
- [ ] 知识库列表与管理
- [ ] 文档上传与解析
- [ ] 知识图谱可视化
- [ ] RAG 检索配置
- [ ] 知识库与专家关联管理

### Phase 9: 系统设置

- [ ] 用户偏好设置
- [ ] 主题切换 (深色/浅色)
- [ ] API 密钥管理
- [ ] 通知设置
- [ ] 数据导出与清理

### Phase 10: 后端集成

- [ ] API 服务对接
- [ ] 用户认证与授权
- [ ] 实时消息 (WebSocket)
- [ ] 错误处理与重试机制
- [ ] 缓存策略优化

---

## 📁 项目结构

```
src/
├── components/         # 通用组件
│   ├── common/         # 基础UI组件
│   └── Sidebar.tsx     # 侧边栏导航
├── features/           # 功能模块
│   ├── canvas/         # 工作流画布
│   ├── chat/           # 对话界面
│   │   ├── components/
│   │   │   ├── ChatHistory.tsx
│   │   │   └── ChatHistory.css
│   │   ├── ChatInterface.tsx
│   │   ├── MessageList.tsx
│   │   └── GenerativeUIRenderer.tsx
│   ├── experts/        # 专家管理
│   │   ├── components/
│   │   │   ├── ExpertList.tsx
│   │   │   ├── ExpertCreation.tsx
│   │   │   ├── ExpertDetail.tsx
│   │   │   ├── ExpertEditModal.tsx
│   │   │   ├── TemplateGallery.tsx
│   │   │   ├── TemplateGallery.css
│   │   │   ├── ExportImportModal.tsx  ⭐ NEW
│   │   │   └── ExportImportModal.css
│   │   ├── ExpertManager.tsx
│   │   ├── ExpertManager.css
│   │   ├── templates.ts
│   │   ├── exportImport.ts            ⭐ NEW
│   │   └── types.ts
│   ├── knowledge/      # 知识库管理
│   └── workflow/       # 工作流管理
├── stores/             # Zustand 状态管理
│   ├── chatStore.ts
│   └── workflowStore.ts
├── types/              # TypeScript 类型定义
├── styles/             # 全局样式
└── App.tsx             # 主应用组件
```

---

## 🔧 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| 状态管理 | Zustand + persist |
| 样式 | CSS Variables + Flexbox/Grid |
| 图标 | Lucide React |
| 工作流 | React Flow |
| 路由 | (待添加) React Router |

---

## 📝 开发笔记

### Bug 修复记录

1. **执行面板定位问题** - 使用 React Portal 渲染到 body
2. **模态框 z-index 问题** - 统一使用 Portal 方案
3. **专家创建消息重复** - 添加 hasInitialized ref 防止 StrictMode 重复

### 设计决策

1. **专家管理替代工作流编排** - 更轻量级的对话驱动方案
2. **系统专家不可编辑** - 保护预设专家配置
3. **对话历史持久化** - 使用 localStorage 存储

---

## 📌 待解决问题

- [ ] MessageList 模块 lint 警告
- [ ] 对话历史性能优化（大量对话时）
- [ ] 移动端响应式适配

---

## 🚀 下次开发建议

1. 完成 **对话导出**，支持 PDF/Markdown 格式
2. 开始 **知识库管理** 模块的 UI 设计
3. 实现 **流式响应**，提升对话体验
