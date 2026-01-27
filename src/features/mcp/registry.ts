/**
 * MCP Tool Registry
 * 
 * Central registry for all MCP tools. Handles:
 * - Tool registration and discovery
 * - Configuration persistence via localStorage
 * - Tool execution routing
 */

import type {
    MCPTool,
    MCPToolRegistration,
    MCPToolParams,
    MCPToolResult,
} from './types';

// Storage key for tool registrations
const STORAGE_KEY = 'mcp_tool_registrations';

// =============================================
// Built-in Tool Definitions
// =============================================

export const SYSTEM_MCP_TOOLS: MCPTool[] = [
    {
        id: 'mcp-ocr',
        name: 'MinerU OCR',
        description: '文档 OCR 文字识别，支持 PDF、图片等格式',
        icon: '📄',
        category: 'ocr',
        enabled: true,  // Default enabled since we have a real API
        isSystem: true,
        configSchema: [
            { key: 'apiUrl', label: 'API URL', type: 'text', required: true, placeholder: 'http://140.206.138.45:8000', default: 'http://140.206.138.45:8000' },
            { key: 'useMock', label: '使用 Mock 模式', type: 'boolean', required: false, default: false },
        ],
        config: { apiUrl: 'http://140.206.138.45:8000', useMock: false },
    },
    {
        id: 'mcp-sql',
        name: 'SQL 执行器',
        description: '执行 SQL 查询，用于数据库数据检索',
        icon: '🗄️',
        category: 'database',
        enabled: true,
        isSystem: true,
        configSchema: [
            { key: 'dbPath', label: '数据库路径', type: 'text', required: true, placeholder: '/path/to/database.db' },
            { key: 'timeout', label: '超时时间(ms)', type: 'number', required: false, default: 10000 },
        ],
        config: { timeout: 10000 },
    },
    {
        id: 'mcp-knowledge',
        name: '知识库检索',
        description: '从向量数据库中检索相关知识片段',
        icon: '📚',
        category: 'knowledge',
        enabled: false,
        isSystem: true,
        configSchema: [
            { key: 'vectorDbUrl', label: '向量数据库 URL', type: 'text', required: true, placeholder: 'http://localhost:6333' },
            { key: 'collectionName', label: '集合名称', type: 'text', required: true, placeholder: 'documents' },
            { key: 'topK', label: '返回数量', type: 'number', required: false, default: 5 },
        ],
        config: { topK: 5 },
    },
    {
        id: 'mcp-chart',
        name: '图表生成',
        description: '根据数据生成可视化图表',
        icon: '📊',
        category: 'chart',
        enabled: false,
        isSystem: true,
        configSchema: [
            {
                key: 'chartType', label: '默认图表类型', type: 'select', required: false, options: [
                    { value: 'bar', label: '柱状图' },
                    { value: 'line', label: '折线图' },
                    { value: 'pie', label: '饼图' },
                ], default: 'bar'
            },
        ],
        config: { chartType: 'bar' },
    },
];

// =============================================
// Registry Functions
// =============================================

/**
 * Load tool registrations from localStorage
 */
export function loadRegistrations(): MCPToolRegistration[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load MCP registrations:', e);
    }
    return [];
}

/**
 * Save tool registrations to localStorage
 */
export function saveRegistrations(registrations: MCPToolRegistration[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
    } catch (e) {
        console.error('Failed to save MCP registrations:', e);
    }
}

/**
 * Get all available tools with their current configuration
 */
export function getAllTools(): MCPTool[] {
    const registrations = loadRegistrations();
    const regMap = new Map(registrations.map(r => [r.toolId, r]));

    return SYSTEM_MCP_TOOLS.map(tool => {
        const reg = regMap.get(tool.id);
        if (reg) {
            return {
                ...tool,
                enabled: reg.enabled,
                config: { ...tool.config, ...reg.config },
            };
        }
        return tool;
    });
}

/**
 * Get enabled tools only
 */
export function getEnabledTools(): MCPTool[] {
    return getAllTools().filter(t => t.enabled);
}

/**
 * Get a specific tool by ID
 */
export function getToolById(toolId: string): MCPTool | undefined {
    return getAllTools().find(t => t.id === toolId);
}

/**
 * Update tool configuration
 */
export function updateToolConfig(toolId: string, config: Record<string, unknown>, enabled: boolean): void {
    const registrations = loadRegistrations();
    const existingIdx = registrations.findIndex(r => r.toolId === toolId);

    const registration: MCPToolRegistration = {
        toolId,
        enabled,
        config,
        addedAt: existingIdx >= 0 ? registrations[existingIdx].addedAt : new Date().toISOString(),
    };

    if (existingIdx >= 0) {
        registrations[existingIdx] = registration;
    } else {
        registrations.push(registration);
    }

    saveRegistrations(registrations);
}

/**
 * Reset tool to default configuration
 */
export function resetToolConfig(toolId: string): void {
    const registrations = loadRegistrations();
    const filtered = registrations.filter(r => r.toolId !== toolId);
    saveRegistrations(filtered);
}

// =============================================
// Tool Execution (Placeholder - will be enhanced)
// =============================================

/**
 * Execute a tool by ID with given parameters
 */
export async function executeTool(toolId: string, params: MCPToolParams): Promise<MCPToolResult> {
    const tool = getToolById(toolId);

    if (!tool) {
        return { success: false, output: null, error: `Tool not found: ${toolId}` };
    }

    if (!tool.enabled) {
        return { success: false, output: null, error: `Tool is disabled: ${toolId}` };
    }

    // Dynamic import of tool implementation
    try {
        const startTime = Date.now();
        let result: MCPToolResult;

        switch (toolId) {
            case 'mcp-ocr': {
                const { executeOCRTool } = await import('./tools/ocrTool');
                result = await executeOCRTool(params, tool.config);
                break;
            }
            case 'mcp-sql': {
                const { executeSQLTool } = await import('./tools/sqlTool');
                result = await executeSQLTool(params, tool.config);
                break;
            }
            case 'mcp-knowledge':
                // Placeholder
                result = { success: false, output: null, error: 'Knowledge tool not yet implemented' };
                break;
            case 'mcp-chart':
                // Placeholder
                result = { success: false, output: null, error: 'Chart tool not yet implemented' };
                break;
            default:
                result = { success: false, output: null, error: `Unknown tool: ${toolId}` };
        }

        result.duration = Date.now() - startTime;
        return result;
    } catch (e) {
        return { success: false, output: null, error: String(e) };
    }
}

/**
 * Generate tool descriptions for Agent system prompt
 */
export function generateToolDescriptions(): string {
    const enabledTools = getEnabledTools();

    if (enabledTools.length === 0) {
        return '';
    }

    const toolDescriptions = enabledTools.map(tool => {
        return `- ${tool.id}: ${tool.description}`;
    }).join('\n');

    return `\n\n## 可用工具\n${toolDescriptions}\n\n要调用工具，请使用以下格式：\n<tool_call>\n{"tool": "工具ID", "params": {...}}\n</tool_call>`;
}
