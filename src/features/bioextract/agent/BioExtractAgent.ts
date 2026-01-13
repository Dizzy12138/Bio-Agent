/**
 * BioExtract-AI Agent 核心模块 (Optimized)
 * 
 * 增强特性：
 * 1. 支持 ReAct 循环 (推理 -> 执行 -> 观察 -> 回答)
 * 2. 真实的 SQL 执行能力注入
 * 3. 更鲁棒的标签解析
 */

import { callLLM, type LLMConfig, type ChatMessage } from '../api/llmService';

// =============================================
// Agent 配置常量
// =============================================
export const AGENT_CONFIG = {
    maxIterations: 3,              // 最大交互轮数 (防止死循环)
    defaultTemperature: 0.5,       // 降低温度以获得更稳定的逻辑
    sqlTimeout: 10000,             // SQL 执行超时 (ms)
};

// =============================================
// 类型定义
// =============================================

export type ThinkingStepType =
    | 'analyzing'      // 分析用户意图
    | 'planning'       // 规划
    | 'querying'       // 生成 SQL
    | 'executing'      // 执行 SQL (新增)
    | 'observing'      // 观察数据 (新增)
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
 * 新增 executeQuery 方法，用于注入真实的数据库查询逻辑
 */
export interface AgentContext {
    userMessage: string;
    conversationHistory: ChatMessage[];
    databaseSchema: string;
    // 注入执行器：返回 Promise<JSON字符串 或 对象>
    executeQuery: (sql: string) => Promise<unknown>;
}

export interface AgentResult {
    success: boolean;
    response: string;
    thinkingSteps: ThinkingStep[];
    executedSQLs: string[]; // 记录所有执行过的 SQL
    finalDataSnapshot?: unknown; // 最后一次查询的数据快照
    totalDuration: number;
}

export interface AgentCallbacks {
    onStep?: (step: ThinkingStep) => void;
    onError?: (error: Error) => void;
}

// =============================================
// System Prompt (增强版 - 含领域知识)
// =============================================

const AGENT_SYSTEM_PROMPT = `你是 BioExtract-AI Agent，专门用于从数据库中筛选生物材料、微生物工程和药物递送数据的智能助手。

## 核心指令
你必须严格遵守 ReAct (推理-行动) 模式。当用户问题需要数据支持时，**必须**查询数据库，严禁编造数据。

## 领域知识

### 关键靶标/生产者
- **抗菌功能 (E_A_*)**: 靶标微生物是 **Bacillus subtilis (枯草芽孢杆菌)**
- **产氧功能 (E_B_*)**: 生产者是 **Chlorella vulgaris (普通小球藻)**，通过光合作用产氧

### 微生物系统类型
- \`Single_Strain\`: 单菌株系统
- \`Consortium\`: 多菌株/共培养系统

### 微生物空间排布
- \`Encapsulated\`: 包埋（凝胶/微胶囊）
- \`Biofilm\`: 生物膜状态
- \`Suspension\`: 悬浮培养/游离状态

### 效应模块功能 (E_*)
- **E_A_***: 抗菌功能 (Antibacterial) - 4个评价标准
- **E_B_***: 产氧功能 (Oxygenation) - 3个评价标准
- **E_C_***: 免疫调节 (Immunomodulation)
- **E_D_***: 组织修复 (Tissue Repair)
- **E_E_***: 代谢调节 (Metabolic Regulation)
- **E_F_***: 肿瘤治疗 (Tumor Therapy)

## 数据库表概览

### 1. delivery_qwen (递送载体, ~258条)
核心字段: carrier_type, carrier_response, carrier_components, payload_items
功能模块: B_*(生物相容性), F_*(功能特性), C_*(微生物相容性), P_*(加工特性)

### 2. micro_feat (微生物工程, ~948条)
核心字段: system_type, composition, spatial_arrangement
模块前缀:
- C_*: 底盘生理 (oxygen_tolerance, growth_conditions 等)
- G_*: 遗传工程 (genetic_tools, circuit_control 等)
- S_*: 感知模块 (信号感知, 逻辑门)
- E_*: 效应模块 (抗菌/产氧/免疫调节等)
- B_*: 生物安全 (bsl_level, biocontainment_strategy)

### 3. paper_tags (论文分类, ~43,245条)
字段: paper_id, title, abstract, classification, l1, l2, l3, reasoning
分类层级: l1 (一级) → l2 (二级) → l3 (三级)

### 4. polymer_classification (高分子分类)
### 5. experiment_conditions / experiment_results (ATPS实验)

## 常用查询模式

**查找产氧微生物:**
\`SELECT paper_id, composition, E_B_mechanism_desc FROM micro_feat WHERE E_B_has_oxygenation = 'True'\`

**查找抗菌微生物:**
\`SELECT paper_id, composition, E_A_mechanism_desc FROM micro_feat WHERE E_A_has_antibacterial = 'True'\`

**按分类筛选论文:**
\`SELECT title, abstract FROM paper_tags WHERE l1 = 'Delivery'\`

**查找特定响应载体:**
\`SELECT system_name, carrier_components FROM delivery_qwen WHERE carrier_response LIKE '%pH%'\`

## 输出协议
你的回复必须严格包含在以下 XML 标签中：

1. **思考过程** (必须)：
<thinking>
...在此处进行意图分析、步骤规划和逻辑推理...
</thinking>

2. **数据库操作** (可选，如果需要查数据)：
<query>
SELECT ...
</query>

3. **最终回答** (仅在获得足够信息或无需查库时输出)：
<answer>
...在此处通过 Markdown 格式回复用户...
</answer>

**注意：**
- 一次回复中，<query> 和 <answer> 互斥。如果你生成了 SQL，就不要生成 Answer，等待系统返回数据给你。
- 如果查询结果为空，请尝试调整查询条件（如使用 LIKE 模糊匹配）。
- 回答时请使用中文。
- 表格数据请用 Markdown 表格格式呈现。
`;

// =============================================
// BioExtract Agent 类
// =============================================

export class BioExtractAgent {
    private llmConfig: LLMConfig;
    private callbacks: AgentCallbacks;
    private thinkingSteps: ThinkingStep[] = [];

    constructor(llmConfig: LLMConfig, callbacks: AgentCallbacks = {}) {
        this.llmConfig = llmConfig;
        this.callbacks = callbacks;
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
     */
    private parseOutput(content: string) {
        const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
        const queryMatch = content.match(/<query>([\s\S]*?)<\/query>/i); // 支持 <query> 标签
        const sqlBlockMatch = content.match(/```sql\n([\s\S]*?)```/i); // 兼容 markdown 代码块
        const answerMatch = content.match(/<answer>([\s\S]*?)<\/answer>/i);

        // 优先取 <query> 标签，其次取代码块
        let sql = queryMatch ? queryMatch[1].trim() : (sqlBlockMatch ? sqlBlockMatch[1].trim() : null);
        // 清理 SQL 中的 markdown 符号如果混在 query 标签里
        if (sql) sql = sql.replace(/```sql|```/g, '').trim();

        return {
            thinking: thinkingMatch ? thinkingMatch[1].trim() : null,
            sql: sql,
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
        let currentIteration = 0;
        let finalResponse = "";
        let finalData = null;

        // 1. 初始化消息历史
        let messages: ChatMessage[] = [
            { role: 'system', content: AGENT_SYSTEM_PROMPT + `\n\n## Database Schema\n${context.databaseSchema}` },
            ...context.conversationHistory.filter(m => m.role !== 'system'),
            { role: 'user', content: context.userMessage }
        ];

        try {
            this.addStep('analyzing', '开始处理用户请求...');

            // ==========================================
            // ReAct Loop: 思考 -> 执行 -> 观察 -> 循环
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

                // CASE A: LLM 想要执行 SQL
                if (parsed.sql) {
                    this.addStep('querying', `生成查询: ${parsed.sql}`, { sql: parsed.sql });
                    executedSQLs.push(parsed.sql);

                    // 执行 SQL (调用外部注入的方法)
                    this.addStep('executing', '正在查询数据库...');
                    let queryResult;
                    try {
                        queryResult = await context.executeQuery(parsed.sql);
                        finalData = queryResult; // 保存最后一次数据
                        const rowCount = Array.isArray(queryResult) ? queryResult.length : 1;
                        this.addStep('observing', `查询成功，获取到 ${rowCount} 条数据`);
                    } catch (dbError: unknown) {
                        const errMsg = dbError instanceof Error ? dbError.message : '未知数据库错误';
                        queryResult = `SQL Execution Error: ${errMsg}`;
                        this.addStep('observing', `查询失败: ${errMsg}`);
                    }

                    // 将结果追加到对话历史，作为 Tool Output
                    messages.push({ role: 'assistant', content: content }); // 记录 LLM 的思考和 SQL
                    messages.push({
                        role: 'user', // 这里模拟 User/System 把数据喂回去
                        content: `[System]: 数据库查询结果:\n${JSON.stringify(queryResult, null, 2)}\n\n请根据以上数据，生成最终的中文回答。使用 <answer>...</answer> 标签包裹你的回复。`
                    });

                    // 继续下一次循环，不退出
                    continue;
                }

                // CASE B: LLM 给出了最终答案
                if (parsed.answer) {
                    this.addStep('responding', '生成最终回复');
                    finalResponse = parsed.answer;
                    break; // 任务完成，退出循环
                }

                // CASE C: 既没 SQL 也没 Answer (通常是纯闲聊或格式错误)
                // 尝试直接把原始回复当作答案，或者强制终止
                finalResponse = content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
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
                totalDuration: Date.now() - startTime
            };
        }
    }
}

export default BioExtractAgent;