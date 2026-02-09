/**
 * BioExtract-AI 状态管理 Store (API Version)
 * 使用后端 API 替代本地 SQLite
 */

import { create } from 'zustand';
import type {
    AgentSession,
    AgentMessage,
    ProcessLogEntry,
} from '../types';
import {
    getLLMConfig,
    buildSystemPrompt,
    syncProviders,
    syncSystemSettings,
    type LLMConfig,
    type ChatMessage
} from '../api/llmService';
import { bioextractAPI } from '../api/bioextractAPI';
import {
    BioExtractAgent,
    type ThinkingStep,
} from '../agent';

// =============================================
// 配置常量
// =============================================
const MAX_CONVERSATION_HISTORY = 20; // 最大保留的对话轮数

// =============================================
// State 接口定义
// =============================================
interface BioExtractState {
    // 会话状态
    session: AgentSession | null;
    isProcessing: boolean;
    isDataLoading: boolean;

    // LLM 配置
    llmConfig: LLMConfig | null;
    llmConfigured: boolean;
    conversationHistory: ChatMessage[];

    // 后端数据统计 (新增)
    backendStats: {
        delivery_systems_count: number;
        micro_features_count: number;
        paper_tags_count: number;
        atps_records_count: number;
        last_updated: string | null;
    } | null;
    backendConnected: boolean;

    // 知识库数据 (文献和材料)
    knowledgeStats: {
        totalDocuments: number;
        totalMaterials: number;
    } | null;

    // 处理日志
    processLog: ProcessLogEntry[];
    showProcessLog: boolean;

    // Agent 思考过程
    thinkingSteps: ThinkingStep[];
    isThinking: boolean;
    showThinking: boolean;
    agentInstance: BioExtractAgent | null;

    // Actions
    initSession: () => Promise<void>;
    endSession: () => void;
    setLLMConfig: (config: LLMConfig) => void;
    loadBackendStats: () => Promise<void>;
    loadKnowledgeStats: () => Promise<void>;  // 新增: 加载文献+材料统计

    // 消息操作
    addUserMessage: (content: string) => void;
    addAgentMessage: (content: string, metadata?: AgentMessage['metadata'], thinkingSteps?: ThinkingStep[]) => void;
    addSystemMessage: (content: string) => void;

    // Agent 调用（核心逻辑）
    sendToAgent: (userMessage: string) => Promise<void>;

    // 思考过程操作
    addThinkingStep: (step: ThinkingStep) => void;
    clearThinkingSteps: () => void;
    toggleThinking: () => void;

    // 日志操作
    addLogEntry: (type: ProcessLogEntry['type'], content: string, details?: Record<string, unknown>) => void;
    toggleProcessLog: () => void;
    clearProcessLog: () => void;
}

// =============================================
// Store 实现
// =============================================
export const useBioExtractStore = create<BioExtractState>((set, get) => ({
    // 初始状态
    session: null,
    isProcessing: false,
    isDataLoading: false,

    llmConfig: null,
    llmConfigured: false,
    conversationHistory: [],

    databaseStatus: null, // deprecated but kept for compatibility

    // 后端状态
    backendStats: null,
    backendConnected: false,

    lastQueryResult: null,
    lastQuerySQL: '',

    // 知识库数据统计
    knowledgeStats: null,

    processLog: [],
    showProcessLog: true,

    thinkingSteps: [],
    isThinking: false,
    showThinking: true,
    agentInstance: null,

    // ========== 后端 API 调用 (新增) ==========

    loadBackendStats: async () => {
        try {
            const stats = await bioextractAPI.getStats();
            set({
                backendStats: stats,
                backendConnected: true,
            });
            get().addLogEntry('info', `>>> BACKEND CONNECTED: ${stats.delivery_systems_count} delivery, ${stats.micro_features_count} micro, ${stats.paper_tags_count} tags`);
        } catch (error) {
            set({ backendConnected: false });
            get().addLogEntry('warning', `>>> BACKEND UNAVAILABLE: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    loadKnowledgeStats: async () => {
        try {
            const stats = await bioextractAPI.getKnowledgeStats();
            set({
                knowledgeStats: {
                    totalDocuments: stats.totalDocuments,
                    totalMaterials: stats.totalMaterials,
                },
            });
            get().addLogEntry('result', `>>> KNOWLEDGE: ${stats.totalDocuments} documents, ${stats.totalMaterials} materials`);
        } catch (error) {
            get().addLogEntry('warning', `>>> KNOWLEDGE STATS UNAVAILABLE: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    // ========== 会话生命周期 ==========

    initSession: async () => {
        // 先同步后端 providers 到本地缓存
        await syncProviders();
        await syncSystemSettings();

        const savedConfig = getLLMConfig();

        const session: AgentSession = {
            id: `session-${Date.now()}`,
            startTime: new Date(),
            status: 'idle',
            steps: [],
            messages: [],
            currentRecommendations: [],
        };

        set({
            session,
            llmConfig: savedConfig,
            llmConfigured: !!savedConfig?.apiKey,
            conversationHistory: [],
            processLog: [],
            isDataLoading: true,
        });

        get().addLogEntry('info', '>>> SESSION INITIALIZED');
        get().addLogEntry('info', '>>> CONNECTING TO BACKEND...');

        try {
            // 异步加载后端统计 (不阻塞主流程)
            await Promise.all([
                get().loadBackendStats(),
                get().loadKnowledgeStats()
            ]);

            // 初始化系统提示词 (使用静态 Schema)
            const dataContext = buildBackendContext();
            const systemPrompt = buildSystemPrompt(dataContext);

            set({
                conversationHistory: [{ role: 'system', content: systemPrompt }],
                isDataLoading: false,
            });

            // 输出欢迎信息
            const { backendConnected, backendStats, knowledgeStats } = get();
            let welcomeMsg = '';
            if (backendConnected) {
                welcomeMsg += `✅ 后端连接成功。\n已加载 BioExtract 数据 (${(backendStats?.delivery_systems_count || 0) + (backendStats?.micro_features_count || 0)} 条记录)。`;
            } else {
                welcomeMsg += `⚠️ 连接后端失败。请检查后端服务 (Port 8001) 和 MongoDB 状态。`;
            }
            if (knowledgeStats) {
                welcomeMsg += `\n📚 知识库包含 ${knowledgeStats.totalDocuments} 篇文献和 ${knowledgeStats.totalMaterials} 种材料。`;
            } else {
                welcomeMsg += `\n⚠️ 知识库统计数据加载失败。`;
            }

            get().addSystemMessage(welcomeMsg);

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            get().addLogEntry('warning', `>>> INIT ERROR: ${errorMsg}`);
            set({ isDataLoading: false });
            get().addSystemMessage(`❌ 初始化失败：${errorMsg}`);
        }
    },

    endSession: () => {
        set({
            session: null,
            conversationHistory: [],
            processLog: [],
            thinkingSteps: []
        });
    },

    setLLMConfig: (config: LLMConfig) => {
        set({
            llmConfig: config,
            llmConfigured: !!config.apiKey,
        });

        // 重新构建系统提示词以确保上下文最新
        const dataContext = buildBackendContext();
        const systemPrompt = buildSystemPrompt(dataContext);
        set({
            conversationHistory: [{ role: 'system', content: systemPrompt }],
        });

        get().addLogEntry('info', `>>> LLM CONFIG UPDATED: ${config.provider}/${config.model}`);
    },

    // ========== 消息操作 ==========

    addUserMessage: (content) => {
        const message: AgentMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content,
            timestamp: new Date(),
        };
        set(state => ({
            session: state.session ? { ...state.session, messages: [...state.session.messages, message] } : null,
        }));
    },

    addAgentMessage: (content, metadata, thinkingSteps) => {
        const message: AgentMessage = {
            id: `msg-${Date.now()}`,
            role: 'agent',
            content,
            timestamp: new Date(),
            metadata,
            thinkingSteps: thinkingSteps && thinkingSteps.length > 0 ? [...thinkingSteps] : undefined,
        };
        set(state => ({
            session: state.session ? { ...state.session, messages: [...state.session.messages, message] } : null,
        }));
    },

    addSystemMessage: (content) => {
        const message: AgentMessage = {
            id: `msg-${Date.now()}`,
            role: 'system',
            content,
            timestamp: new Date(),
        };
        set(state => ({
            session: state.session ? { ...state.session, messages: [...state.session.messages, message] } : null,
        }));
    },

    // ========== Agent 核心调用 (API Version) ==========

    sendToAgent: async (userMessage: string) => {
        const { llmConfig, llmConfigured } = get();

        // 如果没配置 LLM，提示用户
        if (!llmConfigured || !llmConfig?.apiKey) {
            get().addAgentMessage(`⚠️ **未配置 LLM**\n请先在设置中配置 API Key。`);
            return;
        }

        set({
            isProcessing: true,
            isThinking: true,
            thinkingSteps: [],
        });

        get().addLogEntry('command', `>>> AGENT START: "${userMessage.slice(0, 30)}..."`);

        try {
            // 实例化 Agent，绑定回调
            const agent = new BioExtractAgent(llmConfig, {
                onStep: (step: ThinkingStep) => {
                    console.log('[Store] onStep callback:', step.type, step.content.slice(0, 50));
                    get().addThinkingStep(step);
                    if (step.type !== 'observing') {
                        get().addLogEntry('info', `    [${step.type.toUpperCase()}] ${step.content.slice(0, 60)}...`);
                    }
                },
                onError: (error: Error) => {
                    get().addLogEntry('warning', `>>> AGENT INTERNAL ERROR: ${error.message}`);
                }
            });

            // 准备上下文 - 现在使用 API 工具描述
            const dataContext = buildBackendContext();

            // 执行 Agent (ReAct 循环) - 不再需要 executeQuery，工具通过 MCP 调用
            const result = await agent.execute({
                userMessage,
                conversationHistory: get().conversationHistory,
                databaseSchema: dataContext,
            });

            get().addLogEntry('result', `>>> AGENT FINISHED: ${result.totalDuration}ms`);

            // 更新对话历史
            const newTurn: ChatMessage[] = [
                { role: 'user', content: userMessage },
                { role: 'assistant', content: result.response }
            ];

            const currentHistory = get().conversationHistory;
            const chatMessages = [...currentHistory.filter(m => m.role !== 'system'), ...newTurn];
            const trimmedChat = chatMessages.slice(-(MAX_CONVERSATION_HISTORY * 2));

            // Rebuild system prompt with latest context if needed, then update conversation history
            const newSystemPrompt = buildSystemPrompt(buildBackendContext());
            set({
                conversationHistory: [{ role: 'system', content: newSystemPrompt }, ...trimmedChat],
                agentInstance: agent,
            });

            // UI 添加消息（附带本轮思考步骤）
            const currentThinkingSteps = [...get().thinkingSteps];
            get().addAgentMessage(result.response, {
                processLog: result.thinkingSteps.map(s => `[${s.type}] ${s.content}`)
            }, currentThinkingSteps);

            // 清空全局思考步骤（已附加到消息上）
            set({ thinkingSteps: [] });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            get().addLogEntry('warning', `>>> AGENT FATAL: ${errorMessage}`);
            get().addAgentMessage(`❌ **Agent 执行失败**\n\n${errorMessage}`);
        }

        set({
            isProcessing: false,
            isThinking: false,
        });
    },

    // ========== 辅助状态操作 ==========

    addLogEntry: (type, content, details) => {
        set(state => ({
            processLog: [...state.processLog, { timestamp: new Date(), type, content, details }]
        }));
    },

    toggleProcessLog: () => set(s => ({ showProcessLog: !s.showProcessLog })),
    clearProcessLog: () => set({ processLog: [] }),

    addThinkingStep: (step) => set(s => ({ thinkingSteps: [...s.thinkingSteps, step] })),
    clearThinkingSteps: () => set({ thinkingSteps: [] }),
    toggleThinking: () => set(s => ({ showThinking: !s.showThinking })),

}));

// =============================================
// Helper Functions
// =============================================

function buildBackendContext(): string {
    return `
## 数据访问方式

通过 API 工具访问后端数据库，不再使用 SQL 查询。
可用工具已在系统提示词中详细说明。

主要数据类型：
- 生物材料 (biomaterials): delivery_system, microbe
- 文献 (documents): 学术论文和研究报告
`;
}