/**
 * BioExtract-AI Agent 核心模块 (Optimized)
 * 
 * 增强特性：
 * 1. 支持 ReAct 循环 (推理 -> 执行 -> 观察 -> 回答)
 * 2. 真实的 MCP 工具调用能力 (SQL, OCR, etc.)
 * 3. 更鲁棒的标签解析 (支持 <tool_call> 协议)
 * 4. 支持从 Agent 管理模块读取可配置的提示词
 */

import { callLLM, getLLMConfig, type LLMConfig, type ChatMessage } from '../api/llmService';
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

const BIOEXTRACT_TOOL_SCHEMAS = [
    {
        name: 'query_micro_features',
        description: '查询 BioExtract 微生物特征数据，支持按论文、系统类型、关键词及分页条件过滤。',
        parameters: {
            type: 'object',
            properties: {
                paper_id: { type: 'string', description: '论文 ID' },
                system_type: { type: 'string', description: '系统类型' },
                keyword: { type: 'string', description: '关键词（如供氧、代谢、菌种）' },
                page: { type: 'number', minimum: 1, description: '页码' },
                page_size: { type: 'number', minimum: 1, description: '每页数量' },
            },
            required: [],
        },
    },
    {
        name: 'query_delivery_systems',
        description: '查询 BioExtract 递送系统数据，支持按论文、载体类型、系统名称、关键词及分页条件过滤。',
        parameters: {
            type: 'object',
            properties: {
                paper_id: { type: 'string', description: '论文 ID' },
                carrier_type: { type: 'string', description: '载体类型' },
                system_name: { type: 'string', description: '系统名称' },
                keyword: { type: 'string', description: '关键词（如供氧、缓释、包埋）' },
                page: { type: 'number', minimum: 1, description: '页码' },
                page_size: { type: 'number', minimum: 1, description: '每页数量' },
            },
            required: [],
        },
    },
];

function formatToolSchemas(): string {
    const schemaText = BIOEXTRACT_TOOL_SCHEMAS
        .map(schema => `### ${schema.name}\n${schema.description}\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``)
        .join('\n\n');
    return schemaText ? `\n\n## 工具参数 Schema\n${schemaText}` : '';
}

// =============================================
// 类型定义
// =============================================

export interface AgentConfigProvider {
    getConfig(): Promise<LLMConfig> | LLMConfig;
}

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
    const toolSchemas = formatToolSchemas();
    return basePrompt + toolDesc + toolSchemas;
}

// =============================================
// =============================================
// BioExtract Agent 类
// =============================================

export class BioExtractAgent {
    private llmConfig: LLMConfig;
    private configProvider?: AgentConfigProvider;
    private callbacks: AgentCallbacks;
    private thinkingSteps: ThinkingStep[] = [];

    constructor(
        configOrProvider: LLMConfig | AgentConfigProvider | null,
        callbacks: AgentCallbacks = {}
    ) {
        this.callbacks = callbacks;

        // 默认空配置
        const defaultConfig: LLMConfig = getLLMConfig() || {
            provider: 'openai',
            apiKey: '',
            model: 'gpt-3.5-turbo',  // 仅在所有配置源都失败时使用
            baseUrl: ''
        };

        if (!configOrProvider) {
            this.llmConfig = defaultConfig;
        } else if ('getConfig' in configOrProvider && typeof configOrProvider.getConfig === 'function') {
            this.configProvider = configOrProvider as AgentConfigProvider;
            this.llmConfig = defaultConfig; // 初始占位，运行时会更新
        } else {
            this.llmConfig = configOrProvider as LLMConfig;
        }
    }

    // 允许外部更新配置 (例如从系统设置选择后)
    public updateConfig(newConfig: LLMConfig) {
        this.llmConfig = newConfig;
        // 如果这里直接设置了，我们可以清除 provider 以优先使用 explicit config?
        // 不，保持 provider，但 updateConfig 代表一次性的 override.
        // 简单起见，覆盖当前 config
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
     * 提取标签内容 (Robust)
     * 1. 查找 <tagName>
     * 2. 查找 </tagName>，如果没有找到但存在起始标签，尝试提取剩余内容（处理截断）
     */
    private extractTagContent(text: string, tagName: string): string | null {
        const startTag = `<${tagName}>`;
        const endTag = `</${tagName}>`;

        const startIndex = text.indexOf(startTag);
        if (startIndex === -1) return null;

        const contentStart = startIndex + startTag.length;
        const endIndex = text.indexOf(endTag, contentStart);

        if (endIndex === -1) {
            // 没有找到结束标签，假设是流式传输被截断，或者是 LLM 忘记闭合
            // 简单的策略：如果起始标签存在，取剩余所有内容
            // TODO: 可以添加长度检查，防止提取过长的错误内容
            return text.substring(contentStart).trim();
        }

        return text.substring(contentStart, endIndex).trim();
    }

    /**
     * 尝试解析 JSON，支持简单的自动修复
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private tryParseJson(jsonStr: string): any {
        try {
            return JSON.parse(jsonStr);
        } catch {
            // 简单的修复尝试
            let fixed = jsonStr.trim();
            // 1. 补全结尾
            if (!fixed.endsWith('}') && !fixed.endsWith(']')) {
                fixed += '}'; // 盲猜是对象
            }
            // 2. 补全引号 (简单判断)
            if ((fixed.match(/"/g) || []).length % 2 !== 0) {
                fixed += '"';
                if (!fixed.endsWith('}')) fixed += '}';
            }

            try {
                return JSON.parse(fixed);
            } catch {
                console.warn('Failed to heal JSON:', jsonStr);
                return null;
            }
        }
    }

    /**
     * 解析 LLM 的混合输出 (Enhanced)
     */
    private parseOutput(content: string) {
        const thinking = this.extractTagContent(content, 'thinking');
        const toolCallRaw = this.extractTagContent(content, 'tool_call');
        const queryRaw = this.extractTagContent(content, 'query');
        const answer = this.extractTagContent(content, 'answer');

        // 兼容 SQL markdown block 如果没有 explicit tags
        let sql = queryRaw;
        if (!sql) {
            const sqlBlockMatch = content.match(/```sql\n([\s\S]*?)```/i);
            if (sqlBlockMatch) {
                sql = sqlBlockMatch[1].trim();
            }
        }
        if (sql) sql = sql.replace(/```sql|```/g, '').trim();

        let toolCall = null;
        if (toolCallRaw) {
            toolCall = this.tryParseJson(toolCallRaw);
            if (!toolCall) {
                // 如果解析失败，返回一个错误的工具调用以提示 Agent
                toolCall = {
                    error: true,
                    raw: toolCallRaw,
                    message: "Failed to parse malformed JSON in <tool_call>"
                };
            }
        } else if (sql) {
            // 将 SQL 转换为 tool call 格式
            toolCall = { tool: 'mcp-sql', params: { sql } };
        }

        return {
            thinking,
            toolCall,
            answer
        };
    }

    /**
     * 执行主逻辑
     */
    async execute(context: AgentContext): Promise<AgentResult> {
        const startTime = Date.now();

        // 动态加载配置 (如果有 Provider)
        if (this.configProvider) {
            try {
                this.llmConfig = await this.configProvider.getConfig();
            } catch (e) {
                return {
                    success: false,
                    response: `Configuration Error: ${e instanceof Error ? e.message : String(e)}`,
                    thinkingSteps: [],
                    executedSQLs: [],
                    toolCalls: [],
                    totalDuration: Date.now() - startTime
                };
            }
        }

        this.thinkingSteps = [];
        const executedSQLs: string[] = [];
        const toolCalls: Array<{ tool: string; params: unknown; result: unknown }> = [];
        let currentIteration = 0;
        let finalResponse = "";
        let finalData = null;

        // 1. 初始化消息历史
        const messages: ChatMessage[] = [
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const toolParams: Record<string, any> = { ...params };
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
                    if (tool === 'mcp-sql' && params && typeof params === 'object' && 'sql' in params) {
                        executedSQLs.push(String((params as { sql?: string }).sql));
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
