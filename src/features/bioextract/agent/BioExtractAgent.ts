/**
 * BioExtract-AI Agent 核心模块 (Optimized)
 * 
 * 增强特性：
 * 1. 支持 ReAct 循环 (推理 -> 执行 -> 观察 -> 回答)
 * 2. 真实的 MCP 工具调用能力 (SQL, OCR, etc.)
 * 3. 更鲁棒的标签解析 (支持 <tool_call> 协议)
 * 4. 支持从 Agent 管理模块读取可配置的提示词
 */

import { callLLM, type LLMConfig, type ChatMessage } from '../api/llmService';
import { getAgentPrompt, BIOEXTRACT_SYSTEM_PROMPT } from '../../experts/templates';
import { executeTool, generateToolDescriptions, type MCPToolResult } from '../../mcp';

// =============================================
// Agent 配置常量
// =============================================
export const AGENT_CONFIG = {
    maxIterations: 5,              // 最大交互轮数 (防止死循环)
    defaultTemperature: 0.5,       // 降低温度以获得更稳定的逻辑
    sqlTimeout: 10000,             // SQL 执行超时 (ms)
};

// =============================================
// 类型定义
// =============================================

export type ThinkingStepType =
    | 'analyzing'      // 分析用户意图
    | 'planning'       // 规划
    | 'querying'       // 生成 SQL (Legacy)
    | 'tool_calling'   // 调用工具 (New)
    | 'executing'      // 执行工具
    | 'observing'      // 观察数据
    | 'reasoning'      // 推理分析
    | 'responding';    // 生成回复

export interface ThinkingStep {
    id: string;
    type: ThinkingStepType;
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

/**
 * Agent 执行上下文
 */
export interface AgentContext {
    userMessage: string;
    conversationHistory: ChatMessage[];
    databaseSchema: string;
    // 注入执行器：保留用于向后兼容，但主要通过 MCP 调用
    executeQuery?: (sql: string) => Promise<unknown>;
    // 上下文文件 (用于 OCR)
    activeDocument?: { url: string; name: string };
}

export interface AgentResult {
    success: boolean;
    response: string;
    thinkingSteps: ThinkingStep[];
    executedSQLs: string[]; // 记录所有执行过的 SQL (Legacy)
    toolCalls: Array<{ tool: string; params: unknown; result: unknown }>; // 记录所有工具调用
    finalDataSnapshot?: unknown; // 最后一次数据快照
    totalDuration: number;
}

export interface AgentCallbacks {
    onStep?: (step: ThinkingStep) => void;
    onError?: (error: Error) => void;
}

// =============================================
// System Prompt
// =============================================

// 获取当前配置的系统提示词（支持 localStorage 覆盖）
function getSystemPrompt(): string {
    // 优先使用用户自定义提示词，回退到默认
    const basePrompt = getAgentPrompt('system-bioextract-agent') || BIOEXTRACT_SYSTEM_PROMPT;
    // 动态附加工具描述
    const toolDesc = generateToolDescriptions();
    return basePrompt + toolDesc;
}

// =============================================
// =============================================
// BioExtract Agent 类
// =============================================

export class BioExtractAgent {
    private llmConfig: LLMConfig;
    private callbacks: AgentCallbacks;
    private thinkingSteps: ThinkingStep[] = [];

    constructor(initialConfig: LLMConfig | null, callbacks: AgentCallbacks = {}) {
        this.callbacks = callbacks;
        // 如果没有传入配置，尝试加载系统配置
        this.llmConfig = initialConfig || this.loadSystemConfig();
    }

    private loadSystemConfig(): LLMConfig {
        // 从 localStorage 读取系统配置 (临时方案，理想情况应通过 Context)
        // 实际上 SettingsPage 并未将完整 Provider 存入 localStorage，只存了 activeTab
        // 这里我们需要一个新的帮助函数来同步系统配置
        // 假定系统会有一个 SystemLLMStore 或者我们回退到 process.env / 默认值
        const saved = localStorage.getItem('bioextract_llm_config');
        if (saved) return JSON.parse(saved);

        // Fallback
        return {
            provider: 'openai',
            apiKey: '',
            model: 'gpt-4o',
            baseUrl: 'https://api.openai.com/v1'
        };
    }

    // 允许外部更新配置 (例如从系统设置选择后)
    public updateConfig(newConfig: LLMConfig) {
        this.llmConfig = newConfig;
    }

    private addStep(type: ThinkingStepType, content: string, metadata?: Record<string, unknown>) {
        const step: ThinkingStep = {
            id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type,
            content,
            timestamp: new Date(),
            metadata
        };
        this.thinkingSteps.push(step);
        this.callbacks.onStep?.(step);
    }

    /**
     * 解析 LLM 的混合输出
     * 支持 <query> (旧版) 和 <tool_call> (新版)
     */
    private parseOutput(content: string) {
        const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);

        // 1. 尝试解析 Tool Call
        const toolCallMatch = content.match(/<tool_call>([\s\S]*?)<\/tool_call>/i);

        // 2. 兼容旧版 SQL Query
        const queryMatch = content.match(/<query>([\s\S]*?)<\/query>/i);
        const sqlBlockMatch = content.match(/```sql\n([\s\S]*?)```/i);
        let sql = queryMatch ? queryMatch[1].trim() : (sqlBlockMatch ? sqlBlockMatch[1].trim() : null);
        if (sql) sql = sql.replace(/```sql|```/g, '').trim();

        // 3. 解析 Answer
        const answerMatch = content.match(/<answer>([\s\S]*?)<\/answer>/i);

        let toolCall = null;
        if (toolCallMatch) {
            try {
                toolCall = JSON.parse(toolCallMatch[1].trim());
            } catch (e) {
                console.error('Failed to parse tool call JSON:', e);
            }
        } else if (sql) {
            // 将 SQL 转换为 tool call 格式
            toolCall = { tool: 'mcp-sql', params: { sql } };
        }

        return {
            thinking: thinkingMatch ? thinkingMatch[1].trim() : null,
            toolCall,
            answer: answerMatch ? answerMatch[1].trim() : null
        };
    }

    /**
     * 执行主逻辑
     */
    async execute(context: AgentContext): Promise<AgentResult> {
        const startTime = Date.now();
        this.thinkingSteps = [];
        const executedSQLs: string[] = [];
        const toolCalls: Array<{ tool: string; params: unknown; result: unknown }> = [];
        let currentIteration = 0;
        let finalResponse = "";
        let finalData = null;

        // 1. 初始化消息历史
        let messages: ChatMessage[] = [
            { role: 'system', content: getSystemPrompt() + `\n\n## Database Schema\n${context.databaseSchema}` },
            ...context.conversationHistory.filter(m => m.role !== 'system'),
            { role: 'user', content: context.userMessage }
        ];

        // 如果有活跃文档，注入上下文
        if (context.activeDocument) {
            // 临时注入文档提示
            const docContext = `\n\n当前查看的文档: ${context.activeDocument.name} (${context.activeDocument.url})`;
            // 实际上这应该在 System Prompt 中或作为 Observation
            messages[0].content += docContext;
        }

        try {
            this.addStep('analyzing', '开始处理用户请求...');

            // ==========================================
            // ReAct Loop
            // ==========================================
            while (currentIteration < AGENT_CONFIG.maxIterations) {
                currentIteration++;

                // --- Call LLM ---
                const llmResponse = await callLLM(this.llmConfig, messages);
                const content = llmResponse.content;
                const parsed = this.parseOutput(content);

                // 记录思考过程
                if (parsed.thinking) {
                    this.addStep('reasoning', parsed.thinking);
                }

                // CASE A: Tool Execution
                if (parsed.toolCall) {
                    const { tool, params } = parsed.toolCall;

                    this.addStep('tool_calling', `调用工具: ${tool}`, { tool, params });

                    // 特殊处理上下文注入 (例如 OCR 需要 fileUrl)
                    const toolParams: any = { ...params };
                    if (tool === 'mcp-ocr' && !toolParams.fileUrl && context.activeDocument) {
                        toolParams.fileUrl = context.activeDocument.url;
                        this.addStep('planning', `自动注入文档 URL: ${context.activeDocument.url}`);
                    }

                    // Execute Tool
                    this.addStep('executing', `正在执行 ${tool}...`);
                    let toolResult: MCPToolResult;

                    try {
                        toolResult = await executeTool(tool, { input: toolParams });
                    } catch (e) {
                        toolResult = { success: false, output: null, error: String(e) };
                    }

                    // Process Result
                    if (toolResult.success) {
                        const outputStr = JSON.stringify(toolResult.output);
                        const preview = outputStr.length > 200 ? outputStr.substring(0, 200) + '...' : outputStr;
                        this.addStep('observing', `执行成功: ${preview}`);
                        finalData = toolResult.output;
                    } else {
                        this.addStep('observing', `执行失败: ${toolResult.error}`);
                        finalData = { error: toolResult.error };
                    }

                    // Record Call
                    toolCalls.push({ tool, params: toolParams, result: finalData });
                    if (tool === 'mcp-sql') {
                        executedSQLs.push((params as any).sql);
                    }

                    // Append to History
                    messages.push({ role: 'assistant', content: content });
                    messages.push({
                        role: 'user',
                        content: `[System]: Tool '${tool}' result:\n${JSON.stringify(finalData, null, 2)}\n\n请根据以上结果继续推理或生成回答。`
                    });

                    continue;
                }

                // CASE B: Final Answer
                if (parsed.answer) {
                    this.addStep('responding', '生成最终回复');
                    finalResponse = parsed.answer;
                    break;
                }

                // CASE C: Fallback (Chat or Failure)
                finalResponse = content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
                // 移除可能的工具调用标签残留
                finalResponse = finalResponse.replace(/<tool_call>[\s\S]*?<\/tool_call>/, '').trim();

                if (!finalResponse) {
                    finalResponse = "抱歉，我无法理解您的请求。请尝试重新表述。";
                }
                break;
            }

            return {
                success: true,
                response: finalResponse || "抱歉，我无法根据现有数据得出结论。",
                thinkingSteps: this.thinkingSteps,
                executedSQLs,
                toolCalls,
                finalDataSnapshot: finalData,
                totalDuration: Date.now() - startTime
            };

        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error('未知错误');
            this.callbacks.onError?.(err);
            return {
                success: false,
                response: `系统错误: ${err.message}`,
                thinkingSteps: this.thinkingSteps,
                executedSQLs,
                toolCalls,
                totalDuration: Date.now() - startTime
            };
        }
    }
}

export default BioExtractAgent;