/**
 * BioExtract-AI LLM 服务
 * 调用真实大语言模型进行智能筛选和推荐
 */

// LLM 配置接口
export interface LLMConfig {
    provider: 'openai' | 'gemini' | 'anthropic' | 'deepseek' | 'local';
    apiKey: string;
    baseUrl?: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
}

// 消息格式
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// LLM 响应
export interface LLMResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// =============================================
// 配置常量
// =============================================
const LLM_DEFAULT_TEMPERATURE = 0.7;
const LLM_DEFAULT_MAX_TOKENS = 16384;
const LLM_CONFIG_STORAGE_KEY = 'bioextract_llm_config';

// 默认配置
const DEFAULT_CONFIG: Partial<LLMConfig> = {
    temperature: LLM_DEFAULT_TEMPERATURE,
    maxTokens: LLM_DEFAULT_MAX_TOKENS,
};

// 从 localStorage 获取配置
export function getLLMConfig(): LLMConfig | null {
    try {
        const stored = localStorage.getItem(LLM_CONFIG_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load LLM config:', e);
    }
    return null;
}

// 保存配置到 localStorage
export function saveLLMConfig(config: LLMConfig): void {
    localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

// 构建系统提示词
export function buildSystemPrompt(dataContext: string): string {
    return `你是 BioExtract-AI，一个专业的生物材料智能筛选助手。你的任务是基于用户提供的需求，从已加载的药物递送数据库中筛选合适的聚合物材料和载体设计方案，并给出专业的推荐。

## 你的能力：
1. **Drug Delivery 数据库查询**：你可以查询 drug_delivery.csv 中的药物递送文献数据，包含聚合物名称、载体形态、响应机制、负载物信息、释放特性等
2. **聚合物筛选**：根据用户需求筛选合适的聚合物材料（如 PEG、壳聚糖、海藻酸盐等）
3. **载体设计推荐**：推荐适合的载体形态（水凝胶、微球、纳米颗粒等）
4. **响应机制分析**：分析 pH 响应、酶响应、温度响应等智能释放机制
5. **文献溯源**：基于数据库中的论文信息提供文献参考

## 回答格式要求：
1. 使用 Markdown 格式，包含清晰的标题和分点
2. 对于推荐方案，必须说明每个组分的作用机制
3. 使用表情符号增强可读性（如 ✅ ❌ ⚠️ 📊 🧬 💊）
4. 引用数据库中的具体案例时，说明文献来源
5. 如果数据库中没有直接匹配的记录，基于专业知识给出推荐并注明

## 数据库字段说明：
- **载体设计_聚合物名称**: 使用的聚合物材料
- **载体设计_载体形态**: 载体结构（水凝胶、微球、纳米颗粒等）
- **载体设计_响应机制**: 智能响应释放机制
- **负载物信息_名称/类型/形态状态**: 负载药物或微生物信息
- **微生物指标_包埋效率/保护性能/释放后活性/泄露控制**: 微生物递送相关指标
- **释放特性_触发条件/释放动力学**: 释放行为特征

## 当前已加载的数据上下文：
${dataContext}

请基于以上数据和你的专业知识，回答用户的问题。优先使用数据库中的真实案例作为推荐依据。`
}

// 调用 OpenAI 兼容 API
async function callOpenAICompatible(
    config: LLMConfig,
    messages: ChatMessage[]
): Promise<LLMResponse> {
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: config.temperature ?? DEFAULT_CONFIG.temperature,
            max_tokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
        } : undefined,
    };
}

// 调用 Gemini API
async function callGemini(
    config: LLMConfig,
    messages: ChatMessage[]
): Promise<LLMResponse> {
    const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';

    // 转换消息格式为 Gemini 格式
    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

    // 系统指令
    const systemInstruction = messages.find(m => m.role === 'system')?.content;

    const response = await fetch(
        `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents,
                systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                generationConfig: {
                    temperature: config.temperature ?? DEFAULT_CONFIG.temperature,
                    maxOutputTokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
        content,
        usage: data.usageMetadata ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
        } : undefined,
    };
}

// 调用 Anthropic Claude API
async function callAnthropic(
    config: LLMConfig,
    messages: ChatMessage[]
): Promise<LLMResponse> {
    const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';

    // 提取系统消息
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
            system: systemMessage,
            messages: chatMessages.map(m => ({
                role: m.role,
                content: m.content,
            })),
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
        content: data.content?.[0]?.text || '',
        usage: data.usage ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        } : undefined,
    };
}

// 主调用函数
export async function callLLM(
    config: LLMConfig,
    messages: ChatMessage[]
): Promise<LLMResponse> {
    switch (config.provider) {
        case 'openai':
        case 'deepseek':
        case 'local':
            return callOpenAICompatible(config, messages);
        case 'gemini':
            return callGemini(config, messages);
        case 'anthropic':
            return callAnthropic(config, messages);
        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
}

// 预设的模型选项（作为后备）
export const LLM_PROVIDERS = [
    {
        id: 'openai',
        name: 'OpenAI',
        fallbackModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        defaultBaseUrl: 'https://api.openai.com/v1',
        supportsModelList: true,
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        fallbackModels: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        supportsModelList: true,
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        fallbackModels: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
        defaultBaseUrl: 'https://api.anthropic.com/v1',
        supportsModelList: false, // Anthropic 不提供公开的模型列表 API
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        fallbackModels: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
        defaultBaseUrl: 'https://api.deepseek.com/v1',
        supportsModelList: true,
    },
    {
        id: 'local',
        name: '本地/自定义',
        fallbackModels: [],
        defaultBaseUrl: 'http://localhost:11434/v1',
        supportsModelList: true,
    },
] as const;

// 模型信息接口
export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
    contextLength?: number;
    created?: number;
}

// 动态获取 OpenAI 兼容 API 的模型列表
async function fetchOpenAIModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
    try {
        const response = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data = await response.json();
        const models: ModelInfo[] = (data.data || [])
            .filter((m: { id: string }) => {
                // 过滤掉非聊天模型（如 embedding、whisper 等）
                const id = m.id.toLowerCase();
                return id.includes('gpt') ||
                    id.includes('chat') ||
                    id.includes('turbo') ||
                    id.includes('deepseek') ||
                    id.includes('qwen') ||
                    id.includes('llama') ||
                    id.includes('mistral') ||
                    id.includes('claude');
            })
            .map((m: { id: string; created?: number; owned_by?: string }) => ({
                id: m.id,
                name: m.id,
                created: m.created,
                description: m.owned_by,
            }))
            .sort((a: ModelInfo, b: ModelInfo) => (b.created || 0) - (a.created || 0));

        return models;
    } catch (error) {
        console.error('Failed to fetch OpenAI models:', error);
        return [];
    }
}

// 动态获取 Gemini 模型列表
async function fetchGeminiModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
    try {
        const response = await fetch(`${baseUrl}/models?key=${apiKey}`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data = await response.json();
        const models: ModelInfo[] = (data.models || [])
            .filter((m: { name: string; supportedGenerationMethods?: string[] }) => {
                // 只保留支持 generateContent 的模型
                return m.supportedGenerationMethods?.includes('generateContent');
            })
            .map((m: { name: string; displayName?: string; description?: string; inputTokenLimit?: number }) => ({
                id: m.name.replace('models/', ''),
                name: m.displayName || m.name.replace('models/', ''),
                description: m.description,
                contextLength: m.inputTokenLimit,
            }));

        return models;
    } catch (error) {
        console.error('Failed to fetch Gemini models:', error);
        return [];
    }
}

// 主函数：根据提供商获取模型列表
export async function fetchAvailableModels(
    provider: LLMConfig['provider'],
    apiKey: string,
    baseUrl?: string
): Promise<ModelInfo[]> {
    const providerConfig = LLM_PROVIDERS.find(p => p.id === provider);
    if (!providerConfig) {
        return [];
    }

    const url = baseUrl || providerConfig.defaultBaseUrl;

    try {
        switch (provider) {
            case 'openai':
            case 'deepseek':
            case 'local':
                return await fetchOpenAIModels(url, apiKey);

            case 'gemini':
                return await fetchGeminiModels(url, apiKey);

            case 'anthropic':
                // Anthropic 不支持模型列表 API，返回预设列表
                return providerConfig.fallbackModels.map(id => ({ id, name: id }));

            default:
                return [];
        }
    } catch (error) {
        console.error(`Failed to fetch models for ${provider}:`, error);
        // 返回后备模型列表
        return providerConfig.fallbackModels.map(id => ({ id, name: id }));
    }
}

// 获取后备模型列表
export function getFallbackModels(provider: LLMConfig['provider']): string[] {
    const providerConfig = LLM_PROVIDERS.find(p => p.id === provider);
    return providerConfig ? [...providerConfig.fallbackModels] : [];
}

export default {
    callLLM,
    getLLMConfig,
    saveLLMConfig,
    buildSystemPrompt,
    fetchAvailableModels,
    getFallbackModels,
    LLM_PROVIDERS,
};
