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
        id: 'mcp-neo4j',
        name: 'Neo4j 知识图谱',
        description: '连接 Neo4j 图数据库，执行 Cypher 查询，构建和查询知识图谱',
        icon: '🕸️',
        category: 'database',
        enabled: false,
        isSystem: true,
        configSchema: [
            { key: 'uri', label: 'Neo4j URI', type: 'text', required: true, placeholder: 'bolt://180.169.229.230:51001', default: 'bolt://180.169.229.230:51001' },
            { key: 'username', label: '用户名', type: 'text', required: true, placeholder: 'neo4j', default: 'neo4j' },
            { key: 'password', label: '密码', type: 'password', required: true, placeholder: '请输入密码', default: '' },
            { key: 'database', label: '数据库名称', type: 'text', required: false, placeholder: 'neo4j', default: 'neo4j' },
        ],
        config: { uri: 'bolt://180.169.229.230:51001', username: 'neo4j', password: '', database: 'neo4j' },
    },
    {
        id: 'mcp-ocr',
        name: 'MinerU OCR',
        description: '文档 OCR 文字识别，支持 PDF、图片等格式',
        icon: '📄',
        category: 'ocr',
        enabled: true,
        isSystem: true,
        configSchema: [
            { key: 'apiUrl', label: 'API URL', type: 'text', required: true, placeholder: 'http://140.206.138.45:8000', default: 'http://140.206.138.45:8000' },
            { key: 'useMock', label: '使用 Mock 模式', type: 'boolean', required: false, default: false },
        ],
        config: { apiUrl: 'http://140.206.138.45:8000', useMock: false },
    },
    {
        id: 'search-materials',
        name: '搜索生物材料',
        description: '搜索生物材料数据库，支持按名称、分类、关键词查询。返回材料列表及其关联文献数量。',
        icon: '🧬',
        category: 'bioextract',
        enabled: true,
        isSystem: true,
        configSchema: [],
        config: {},
    },
    {
        id: 'search-documents',
        name: '搜索文献',
        description: '搜索文献数据库，支持按标题、作者、关键词查询。返回文献列表和基本信息。',
        icon: '📚',
        category: 'bioextract',
        enabled: true,
        isSystem: true,
        configSchema: [],
        config: {},
    },
    {
        id: 'get-material-details',
        name: '获取材料详情',
        description: '获取指定材料的详细信息，包括组成、属性、关联文献等。',
        icon: '🔬',
        category: 'bioextract',
        enabled: true,
        isSystem: true,
        configSchema: [],
        config: {},
    },
    {
        id: 'get-paper-content',
        name: '获取论文内容',
        description: '获取指定论文的 Markdown 全文内容。需要提供论文 ID。',
        icon: '📄',
        category: 'bioextract',
        enabled: true,
        isSystem: true,
        configSchema: [],
        config: {},
    },
    {
        id: 'get-bioextract-stats',
        name: '获取统计信息',
        description: '获取 BioExtract 数据库的统计信息：递送系统数量、微生物数量、文献数量等。',
        icon: '📊',
        category: 'bioextract',
        enabled: true,
        isSystem: true,
        configSchema: [],
        config: {},
    },
    {
        id: 'query_micro_features',
        name: '查询微生物特征',
        description: '查询微生物特征。必需参数: "keyword" (功能词或名称，如 "oxygen", "供氧")。可选参数: "system_type", "paper_id"。示例: {"keyword": "oxygen"}',
        icon: '🧫',
        category: 'bioextract',
        enabled: true,
        isSystem: true,
        configSchema: [],
        config: {},
    },
    {
        id: 'query_delivery_systems',
        name: '查询递送系统',
        description: '查询递送系统。必需参数: "keyword" (载体特征或名称，如 "nanoparticle")。可选参数: "carrier_type", "paper_id"。示例: {"keyword": "nanoparticle"}',
        icon: '🚚',
        category: 'bioextract',
        enabled: true,
        isSystem: true,
        configSchema: [],
        config: {},
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
export async function updateToolConfig(toolId: string, config: Record<string, unknown>, enabled: boolean): Promise<void> {
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
    
    // 同步到后端
    await saveToolConfigToBackend(toolId, config, enabled);
}

/**
 * Reset tool to default configuration
 */
export async function resetToolConfig(toolId: string): Promise<void> {
    const registrations = loadRegistrations();
    const filtered = registrations.filter(r => r.toolId !== toolId);
    saveRegistrations(filtered);
    
    // 从后端删除
    try {
        const { mcpAPI } = await import('../../utils/api');
        if (toolId === 'mcp-neo4j') {
            const servers = await mcpAPI.getServers();
            const existingServer = servers.data?.find((s: any) => 
                s.name.includes('Neo4j') || s.id === 'mcp-neo4j'
            );
            if (existingServer) {
                await mcpAPI.deleteServer(existingServer.id);
            }
        } else {
            await mcpAPI.deleteToolConfig(toolId);
        }
    } catch (error) {
        console.error('删除后端配置失败:', error);
    }
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
            case 'mcp-neo4j': {
                // Neo4j工具执行逻辑
                const input = params.input as { query: string };
                if (!input.query) {
                    result = { success: false, output: null, error: '需要提供 Cypher 查询语句 (query)' };
                } else {
                    try {
                        const response = await fetch('/api/v1/neo4j/query', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query: input.query })
                        });
                        if (response.ok) {
                            const data = await response.json();
                            result = { success: true, output: data };
                        } else {
                            result = { success: false, output: null, error: '查询失败' };
                        }
                    } catch (e) {
                        result = { success: false, output: null, error: `Neo4j 查询错误: ${e}` };
                    }
                }
                break;
            }

            case 'mcp-ocr': {
                const { executeOCRTool } = await import('./tools/ocrTool');
                result = await executeOCRTool(params, tool.config);
                break;
            }

            // ===== BioExtract API 工具 =====
            case 'search-materials': {
                const { bioextractAPI } = await import('../bioextract/api/backendAPI');
                const input = params.input as { query?: string; category?: string; subcategory?: string; limit?: number };
                const data = await bioextractAPI.searchMaterials({
                    query: input.query || '',
                    category: input.category,
                    subcategory: input.subcategory,
                    pageSize: input.limit || 10,
                    sortBy: 'paper_count',
                    sortOrder: 'desc',
                });
                result = { success: true, output: data };
                break;
            }

            case 'search-documents': {
                const { bioextractAPI } = await import('../bioextract/api/backendAPI');
                const input = params.input as { query?: string; limit?: number };
                const data = await bioextractAPI.searchDocuments({
                    query: input.query || '',
                    pageSize: input.limit || 10,
                });
                result = { success: true, output: data };
                break;
            }

            case 'get-material-details': {
                const { bioextractAPI } = await import('../bioextract/api/backendAPI');
                const input = params.input as { name: string };
                if (!input.name) {
                    result = { success: false, output: null, error: '需要提供材料名称 (name)' };
                } else {
                    // 先搜索获取详情
                    const data = await bioextractAPI.searchMaterials({
                        query: input.name,
                        pageSize: 1,
                    });
                    if (data.materials.length > 0) {
                        result = { success: true, output: data.materials[0] };
                    } else {
                        result = { success: false, output: null, error: `未找到材料: ${input.name}` };
                    }
                }
                break;
            }

            case 'get-paper-content': {
                const { bioextractAPI } = await import('../bioextract/api/backendAPI');
                const input = params.input as { paper_id: string };
                if (!input.paper_id) {
                    result = { success: false, output: null, error: '需要提供论文 ID (paper_id)' };
                } else {
                    try {
                        const data = await bioextractAPI.getPaperMarkdown(input.paper_id);
                        result = { success: true, output: data };
                    } catch (e) {
                        result = { success: false, output: null, error: `获取论文内容失败: ${e}` };
                    }
                }
                break;
            }

            case 'get-bioextract-stats': {
                const { bioextractAPI } = await import('../bioextract/api/backendAPI');
                const data = await bioextractAPI.getStats();
                result = { success: true, output: data };
                break;
            }

            case 'query_micro_features': {
                const { executeQueryMicroFeaturesTool } = await import('./tools/bioQueryTools');
                result = await executeQueryMicroFeaturesTool(params);
                break;
            }

            case 'query_delivery_systems': {
                const { executeQueryDeliverySystemsTool } = await import('./tools/bioQueryTools');
                result = await executeQueryDeliverySystemsTool(params);
                break;
            }

            case 'mcp-chart':
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


// =============================================
// Backend Sync Functions
// =============================================

/**
 * 从后端同步工具配置到本地
 */
export async function syncToolsWithBackend(): Promise<void> {
    try {
        const { mcpAPI } = await import('../../utils/api');
        
        // 获取后端的 MCP 服务器配置
        const serversResponse = await mcpAPI.getServers();
        const servers = serversResponse.data || [];
        
        // 获取后端的工具配置
        const toolsResponse = await mcpAPI.getAllToolConfigs();
        const toolConfigs = toolsResponse.data || [];
        
        const registrations = loadRegistrations();
        const regMap = new Map(registrations.map(r => [r.toolId, r]));
        
        // 同步 Neo4j 配置
        const neo4jServer = servers.find((s: any) => 
            s.name?.includes('Neo4j') || s.id === 'mcp-neo4j'
        );
        
        if (neo4jServer && neo4jServer.env) {
            const neo4jReg: MCPToolRegistration = {
                toolId: 'mcp-neo4j',
                enabled: neo4jServer.is_enabled || false,
                config: {
                    uri: neo4jServer.env.NEO4J_URI || neo4jServer.env.uri || '',
                    username: neo4jServer.env.NEO4J_USERNAME || neo4jServer.env.username || '',
                    password: neo4jServer.env.NEO4J_PASSWORD || neo4jServer.env.password || '',
                    database: neo4jServer.env.NEO4J_DATABASE || neo4jServer.env.database || 'neo4j',
                },
                addedAt: neo4jServer.created_at || new Date().toISOString(),
            };
            regMap.set('mcp-neo4j', neo4jReg);
        }
        
        // 同步其他工具配置
        for (const toolConfig of toolConfigs) {
            regMap.set(toolConfig.tool_id, {
                toolId: toolConfig.tool_id,
                enabled: toolConfig.enabled,
                config: toolConfig.config,
                addedAt: toolConfig.added_at,
            });
        }
        
        // 保存到 localStorage
        saveRegistrations(Array.from(regMap.values()));
        
        console.log('✅ MCP 配置已从后端同步');
    } catch (error) {
        console.error('从后端同步配置失败:', error);
    }
}

/**
 * 保存工具配置到后端
 */
export async function saveToolConfigToBackend(toolId: string, config: Record<string, unknown>, enabled: boolean): Promise<void> {
    try {
        const { mcpAPI } = await import('../../utils/api');
        
        // 对于 Neo4j 工具，使用特殊的服务器配置格式
        if (toolId === 'mcp-neo4j') {
            const serverData = {
                name: 'Neo4j 知识图谱',
                description: '连接 Neo4j 图数据库，执行 Cypher 查询',
                connection_type: 'stdio',
                env: {
                    NEO4J_URI: config.uri,
                    NEO4J_USERNAME: config.username,
                    NEO4J_PASSWORD: config.password,
                    NEO4J_DATABASE: config.database || 'neo4j',
                },
                is_enabled: enabled,
            };
            
            // 尝试更新或创建
            try {
                const servers = await mcpAPI.getServers();
                const existingServer = servers.data?.find((s: any) => 
                    s.name.includes('Neo4j') || s.id === 'mcp-neo4j'
                );
                
                if (existingServer) {
                    await mcpAPI.updateServer(existingServer.id, serverData);
                } else {
                    await mcpAPI.createServer(serverData);
                }
            } catch (error) {
                console.error('保存 Neo4j 配置到后端失败:', error);
                // 尝试创建新的
                await mcpAPI.createServer(serverData);
            }
        } else {
            // 其他工具使用通用的工具配置格式
            await mcpAPI.saveToolConfig({
                tool_id: toolId,
                enabled,
                config,
                added_at: new Date().toISOString(),
            });
        }
    } catch (error) {
        console.error('同步配置到后端失败:', error);
        throw error;
    }
}
