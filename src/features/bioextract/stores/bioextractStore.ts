/**
 * BioExtract-AI 状态管理 Store (Complete & Fixed)
 * 整合了 Agent ReAct 闭环与 SQLite 执行逻辑
 */

import { create } from 'zustand';
import type {
    AgentSession,
    AgentMessage,
    ProcessLogEntry,
} from '../types';
import { sqliteDb, type QueryResult, type DatabaseStatus } from '../api/sqliteDatabase';
import {
    callLLM,
    getLLMConfig,
    buildSystemPrompt,
    type LLMConfig,
    type ChatMessage
} from '../api/llmService';
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

    // 数据库状态
    databaseStatus: DatabaseStatus | null;

    // SQL 查询结果
    lastQueryResult: QueryResult | null;
    lastQuerySQL: string;

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

    // 消息操作
    addUserMessage: (content: string) => void;
    addAgentMessage: (content: string, metadata?: AgentMessage['metadata']) => void;
    addSystemMessage: (content: string) => void;

    // Agent 调用（核心逻辑）
    sendToAgent: (userMessage: string) => Promise<void>;

    // 传统 LLM 调用（兼容旧版/直接SQL）
    sendToLLM: (userMessage: string) => Promise<void>;

    // SQL 查询基础方法
    executeSQL: (sql: string) => Promise<QueryResult>;

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

    databaseStatus: null,
    lastQueryResult: null,
    lastQuerySQL: '',

    processLog: [],
    showProcessLog: true,

    thinkingSteps: [],
    isThinking: false,
    showThinking: true,
    agentInstance: null,

    // ========== 会话生命周期 ==========

    initSession: async () => {
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
            lastQueryResult: null,
            isDataLoading: true,
        });

        get().addLogEntry('info', '>>> SESSION INITIALIZED');
        get().addLogEntry('info', '>>> INITIALIZING SQLite DATABASE...');

        try {
            // 这里假设 sqliteDb 负责加载文件
            await sqliteDb.initialize();
            const status = await sqliteDb.getStatus();

            set({
                databaseStatus: status,
                isDataLoading: false,
            });

            // 记录加载结果
            status.tables.forEach(table => {
                get().addLogEntry('result', `    ${table.name}: ${table.rowCount} rows ✓`);
            });

            // 初始化系统提示词
            const dataContext = buildDatabaseContext(status);
            const systemPrompt = buildSystemPrompt(dataContext);

            set({
                conversationHistory: [{ role: 'system', content: systemPrompt }],
            });

            // 输出欢迎信息
            const welcomeMsg = savedConfig?.apiKey
                ? `✅ 系统就绪。已加载 ${status.totalRows} 条数据。\n当前模型：${savedConfig.model}`
                : `✅ 数据库已加载 (${status.totalRows} 条)。\n⚠️ LLM 未配置，请点击设置配置 API Key。`;

            get().addSystemMessage(welcomeMsg);

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            get().addLogEntry('warning', `>>> DB ERROR: ${errorMsg}`);
            set({ isDataLoading: false });
            get().addSystemMessage(`❌ 数据库初始化失败：${errorMsg}`);
        }
    },

    endSession: () => {
        set({
            session: null,
            conversationHistory: [],
            lastQueryResult: null,
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
        const { databaseStatus } = get();
        if (databaseStatus) {
            const dataContext = buildDatabaseContext(databaseStatus);
            const systemPrompt = buildSystemPrompt(dataContext);
            set({
                conversationHistory: [{ role: 'system', content: systemPrompt }],
            });
        }

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

    addAgentMessage: (content, metadata) => {
        const message: AgentMessage = {
            id: `msg-${Date.now()}`,
            role: 'agent',
            content,
            timestamp: new Date(),
            metadata,
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

    // ========== SQL 基础执行 ==========

    executeSQL: async (sql: string) => {
        get().addLogEntry('query', `>>> SQL: ${sql}`);
        try {
            const result = await sqliteDb.query(sql);
            set({
                lastQueryResult: result,
                lastQuerySQL: sql,
            });
            get().addLogEntry('result', `    Rows returned: ${result.rowCount}`);
            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            get().addLogEntry('warning', `>>> SQL ERROR: ${errorMsg}`);
            throw error;
        }
    },

    // ========== Agent 核心调用 (Fixed) ==========

    sendToAgent: async (userMessage: string) => {
        const { llmConfig, llmConfigured, databaseStatus } = get();

        // 1. 如果没配置 LLM，尝试回退到 sendToLLM (那里有 SQL 拦截逻辑)
        if (!llmConfigured || !llmConfig?.apiKey) {
            return get().sendToLLM(userMessage);
        }

        set({
            isProcessing: true,
            isThinking: true,
            thinkingSteps: [], // 清空上一次思考
        });

        get().addLogEntry('command', `>>> AGENT START: "${userMessage.slice(0, 30)}..."`);

        try {
            // 2. 实例化 Agent，绑定回调
            const agent = new BioExtractAgent(llmConfig, {
                onStep: (step: ThinkingStep) => {
                    console.log('[Store] onStep callback:', step.type, step.content.slice(0, 50));
                    get().addThinkingStep(step);
                    console.log('[Store] After addThinkingStep, count:', get().thinkingSteps.length);
                    // 仅记录关键步骤到日志
                    if (step.type !== 'observing') {
                        get().addLogEntry('info', `    [${step.type.toUpperCase()}] ${step.content.slice(0, 60)}...`);
                    }
                },
                onError: (error: Error) => {
                    get().addLogEntry('warning', `>>> AGENT INTERNAL ERROR: ${error.message}`);
                }
            });

            // 3. 准备上下文
            const dataContext = databaseStatus ? buildDatabaseContext(databaseStatus) : '';

            // 4. 执行 Agent (ReAct 循环)
            const result = await agent.execute({
                userMessage,
                conversationHistory: get().conversationHistory,
                databaseSchema: dataContext,

                // 【核心注入】: 让 Agent 具备执行 SQL 并获取 JSON 的能力
                executeQuery: async (sql: string) => {
                    // 调用 store 的 executeSQL 更新 UI 状态
                    const dbResult = await get().executeSQL(sql);

                    // 将 Table 结构 ({columns:[], values:[]}) 转为 JSON 对象数组
                    if (!dbResult || dbResult.rowCount === 0) return [];

                    const headers = dbResult.columns;
                    // 限制行数以防止 Context Window 爆炸
                    const LIMIT = 20;
                    const rows = dbResult.values.slice(0, LIMIT).map(row => {
                        const obj: Record<string, any> = {};
                        headers.forEach((h, i) => {
                            obj[h] = row[i];
                        });
                        return obj;
                    });

                    if (dbResult.rowCount > LIMIT) {
                        // 可以选择在这里给 LLM 添加一个提示对象，或者仅返回截断数据
                        // 这里的逻辑 Agent 会视为 Context
                    }

                    return rows;
                },
                // 如果需要 OCR，这里应该注入当前文档
                // activeDocument: get().activeDocument 
            });

            get().addLogEntry('result', `>>> AGENT FINISHED: ${result.totalDuration}ms`);

            // 5. 更新对话历史 (User Input + Agent Final Response)
            const newTurn: ChatMessage[] = [
                { role: 'user', content: userMessage },
                { role: 'assistant', content: result.response }
            ];

            // 维护历史记录长度
            const currentHistory = get().conversationHistory;
            const systemMessages = currentHistory.filter(m => m.role === 'system');
            const chatMessages = [...currentHistory.filter(m => m.role !== 'system'), ...newTurn];

            // 截断旧消息
            const trimmedChat = chatMessages.slice(-(MAX_CONVERSATION_HISTORY * 2));

            set({
                conversationHistory: [...systemMessages, ...trimmedChat],
                agentInstance: agent,
            });

            // 6. UI 添加消息
            get().addAgentMessage(result.response, {
                processLog: result.thinkingSteps.map(s => `[${s.type}] ${s.content}`)
            });

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

    // ========== 传统 LLM / Direct SQL 调用 (完整版) ==========

    sendToLLM: async (userMessage: string) => {
        const { llmConfig, conversationHistory, llmConfigured } = get();

        // 1. 拦截 SQL 查询 (Direct SQL Mode)
        const trimmedMessage = userMessage.trim();
        if (/^(SELECT|PRAGMA|WITH|EXPLAIN)/i.test(trimmedMessage)) {
            set({ isProcessing: true });
            try {
                const result = await get().executeSQL(trimmedMessage);

                // 格式化表格显示
                let tableMd = `**📊 SQL 执行结果**\n\n`;
                tableMd += `\`\`\`sql\n${trimmedMessage}\n\`\`\`\n\n`;
                tableMd += `返回 **${result.rowCount}** 行\n\n`;

                if (result.rowCount > 0) {
                    tableMd += `| ${result.columns.join(' | ')} |\n`;
                    tableMd += `| ${result.columns.map(() => '---').join(' | ')} |\n`;

                    const slice = result.values.slice(0, 10);
                    slice.forEach(row => {
                        tableMd += `| ${row.map(c => String(c).slice(0, 50)).join(' | ')} |\n`;
                    });
                    if (result.rowCount > 10) tableMd += `\n*(仅显示前 10 条)*`;
                }

                get().addAgentMessage(tableMd);
            } catch (error) {
                const err = error instanceof Error ? error.message : '未知错误';
                get().addAgentMessage(`❌ **SQL 错误**\n\`\`\`\n${err}\n\`\`\``);
            }
            set({ isProcessing: false });
            return;
        }

        // 2. 如果是普通对话但未配置 LLM
        if (!llmConfigured || !llmConfig?.apiKey) {
            get().addAgentMessage(`⚠️ **未配置 LLM**\n请配置 API Key，或直接输入 SQL 语句查询数据库。`);
            return;
        }

        // 3. 普通 LLM 对话 (Non-Agent Mode)
        set({ isProcessing: true });
        get().addLogEntry('command', `>>> LLM REQUEST (Direct): ${llmConfig.model}`);

        try {
            const history = [...conversationHistory, { role: 'user', content: userMessage } as ChatMessage];
            const response = await callLLM(llmConfig, history);

            // 更新历史
            set({
                conversationHistory: [...history, { role: 'assistant', content: response.content }]
            });

            // 简单的 SQL 代码块检测建议
            const sqlMatch = response.content.match(/```sql\n([\s\S]*?)```/);
            const displayContent = sqlMatch
                ? response.content + `\n\n💡 *检测到 SQL，您可以复制并直接发送以执行。*`
                : response.content;

            get().addAgentMessage(displayContent);
            get().addLogEntry('result', `>>> LLM RESPONSE RCVD`);

        } catch (error) {
            const err = error instanceof Error ? error.message : '未知错误';
            get().addLogEntry('warning', `>>> LLM ERROR: ${err}`);
            get().addAgentMessage(`❌ **请求失败**\n${err}`);
        }
        set({ isProcessing: false });
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

function buildDatabaseContext(status: DatabaseStatus): string {
    const schemas = sqliteDb.getTableSchemas();
    return `
## Database Schema (SQLite)
Total Rows: ${status.totalRows}

${Object.entries(schemas).map(([, schema]) => `
Table: ${schema.name}
Columns: ${schema.columns.map(col => `${col.name} (${col.type})`).join(', ')}
`).join('\n')}

Refuse to answer if data is not in these tables.
`;
}