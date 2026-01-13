// Chat and Conversation Types

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    expertId?: string;      // 关联的专家ID
    expertName?: string;    // 专家名称
    expertAvatar?: string;  // 专家头像
    isFavorite?: boolean;   // 是否收藏此消息
    metadata?: MessageMetadata;
}

export interface MessageMetadata {
    nodeId?: string;
    nodeName?: string;
    toolCalls?: ToolCall[];
    citations?: Citation[];
    generativeUI?: GenerativeUIPayload;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
    status: 'pending' | 'running' | 'success' | 'error';
}

export interface Citation {
    id: string;
    title: string;
    authors?: string[];
    source: string;
    url?: string;
    snippet?: string;
}

export interface GenerativeUIPayload {
    type: 'table' | 'chart' | 'card' | 'comparison' | 'experiment';
    data: unknown;
    config?: Record<string, unknown>;
}

// 对话标签
export interface ConversationTag {
    id: string;
    name: string;
    color: string;
}

// Conversation Session
export interface Conversation {
    id: string;
    title: string;
    expertId?: string;      // 关联的专家ID
    expertName?: string;    // 专家名称
    expertAvatar?: string;  // 专家头像
    messages: Message[];
    messageCount: number;
    createdAt: string;
    updatedAt: string;
    isPinned?: boolean;     // 是否置顶
    isFavorite?: boolean;   // 是否收藏
    tags?: string[];        // 标签ID列表
}

// 预设标签
export const PRESET_TAGS: ConversationTag[] = [
    { id: 'important', name: '重要', color: '#ef4444' },
    { id: 'follow-up', name: '待跟进', color: '#f59e0b' },
    { id: 'reference', name: '参考', color: '#10b981' },
    { id: 'research', name: '研究', color: '#3b82f6' },
    { id: 'case', name: '案例', color: '#8b5cf6' },
    { id: 'question', name: '问题', color: '#ec4899' },
];

// Chat History Group (按日期或专家分组)
export interface ChatHistoryGroup {
    id: string;
    label: string;
    conversations: Conversation[];
}
