// Expert Agent 类型定义

// Agent 类型：区分普通专家和系统 Agent
export type AgentType = 'expert' | 'system-agent';

// 系统 Agent 专用配置
export interface SystemAgentConfig {
    maxIterations?: number;      // ReAct 最大循环次数
    temperature?: number;        // LLM 温度
    enableTools?: boolean;       // 是否启用工具（如 SQL 执行器）
    toolIds?: string[];          // 关联的工具 ID
    modelOverride?: string;      // 覆盖默认模型
}

export interface Expert {
    id: string;
    name: string;
    avatar: string; // emoji 或图片 URL
    description: string;
    domain: string; // 专业领域
    capabilities: string[]; // 能力标签
    systemPrompt: string; // 核心提示词
    tools: string[]; // 可使用的工具 ID
    knowledgeBases: string[]; // 关联的知识库 ID
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    usageCount: number;
    isSystem: boolean; // 是否为系统内置专家
    status: 'active' | 'draft' | 'archived';
    // 新增 Agent 扩展字段
    agentType?: AgentType;
    agentConfig?: SystemAgentConfig;
}

export interface ExpertCreationStep {
    id: string;
    type: 'intro' | 'name' | 'domain' | 'capabilities' | 'tools' | 'knowledge' | 'prompt' | 'preview';
    question: string;
    hint?: string;
}

export interface ExpertCreationState {
    currentStep: number;
    steps: ExpertCreationStep[];
    data: Partial<Expert>;
    messages: ConversationMessage[];
}

export interface ConversationMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    expertId?: string; // 如果是专家回复，标记专家ID
    attachments?: MessageAttachment[];
}

export interface MessageAttachment {
    id: string;
    type: 'image' | 'file' | 'chart';
    name: string;
    url: string;
    metadata?: Record<string, unknown>;
}

export interface ExpertFilter {
    search: string;
    domain: string | null;
    status: Expert['status'] | null;
    isSystem: boolean | null;
    agentType?: AgentType | null; // 新增：按 Agent 类型过滤
}

// 预设领域
export const EXPERT_DOMAINS = [
    { id: 'wound-care', name: '创面护理', icon: '🩹' },
    { id: 'biomaterials', name: '生物材料', icon: '🧬' },
    { id: 'literature', name: '文献分析', icon: '📚' },
    { id: 'diagnostics', name: '诊断辅助', icon: '🔬' },
    { id: 'treatment', name: '治疗方案', icon: '💊' },
    { id: 'research', name: '科研助手', icon: '🎓' },
    { id: 'extraction', name: '信息提取', icon: '📋' }, // 新增
    { id: 'custom', name: '自定义', icon: '✨' },
] as const;

// 预设能力标签
export const EXPERT_CAPABILITIES = [
    '文献检索', '数据分析', '图表生成', '报告撰写',
    '病例分析', '材料推荐', '治疗建议', '知识问答',
    '实验设计', '论文辅助', '翻译', '总结',
    'SQL查询', 'ReAct推理', 'Schema设计', // 新增
] as const;
