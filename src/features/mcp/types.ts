/**
 * MCP (Model Context Protocol) Types
 * 
 * Defines the structure for MCP tools that can be registered
 * and called by Agents.
 */

// Tool category for grouping in UI
export type MCPToolCategory = 'ocr' | 'database' | 'knowledge' | 'chart' | 'custom';

// Tool execution parameters
export interface MCPToolParams {
    input: unknown;
    context?: Record<string, unknown>;
}

// Tool execution result
export interface MCPToolResult {
    success: boolean;
    output: unknown;
    error?: string;
    duration?: number;
}

// Tool configuration schema (for UI generation)
export interface MCPToolConfigField {
    key: string;
    label: string;
    type: 'text' | 'password' | 'number' | 'boolean' | 'select';
    required: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[]; // for select type
    default?: unknown;
}

// MCP Tool definition
export interface MCPTool {
    id: string;
    name: string;
    description: string;
    icon: string; // emoji or icon name
    category: MCPToolCategory;
    enabled: boolean;
    isSystem: boolean; // built-in vs custom
    configSchema: MCPToolConfigField[];
    config: Record<string, unknown>;
    // Tool execution function (will be injected at runtime)
    execute?: (params: MCPToolParams) => Promise<MCPToolResult>;
}

// Tool registration entry (for persistence)
export interface MCPToolRegistration {
    toolId: string;
    enabled: boolean;
    config: Record<string, unknown>;
    addedAt: string;
}

// MCP Registry state
export interface MCPRegistryState {
    tools: MCPTool[];
    registrations: MCPToolRegistration[];
}

// Tool call request (from Agent)
export interface MCPToolCallRequest {
    toolId: string;
    params: MCPToolParams;
    requestId: string;
}

// Tool call response (to Agent)
export interface MCPToolCallResponse {
    requestId: string;
    toolId: string;
    result: MCPToolResult;
}
