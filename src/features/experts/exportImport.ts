import type { Expert } from './types';

// 专家导出格式
export interface ExpertExportData {
    version: '1.0';
    exportedAt: string;
    expert: ExpertConfig;
}

// 专家配置（导出/导入用）
export interface ExpertConfig {
    name: string;
    avatar: string;
    domain: string;
    description: string;
    capabilities: string[];
    tools: string[];
    knowledgeBases: string[];
    systemPrompt: string;
}

// 批量导出格式
export interface ExpertBatchExportData {
    version: '1.0';
    exportedAt: string;
    experts: ExpertConfig[];
}

/**
 * 将专家导出为 JSON 格式
 */
export function exportExpertToJSON(expert: Expert): string {
    const exportData: ExpertExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        expert: {
            name: expert.name,
            avatar: expert.avatar,
            domain: expert.domain,
            description: expert.description,
            capabilities: [...expert.capabilities],
            tools: [...expert.tools],
            knowledgeBases: [...expert.knowledgeBases],
            systemPrompt: expert.systemPrompt,
        },
    };
    return JSON.stringify(exportData, null, 2);
}

/**
 * 批量导出专家
 */
export function exportExpertsToJSON(experts: Expert[]): string {
    const exportData: ExpertBatchExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        experts: experts.map(expert => ({
            name: expert.name,
            avatar: expert.avatar,
            domain: expert.domain,
            description: expert.description,
            capabilities: [...expert.capabilities],
            tools: [...expert.tools],
            knowledgeBases: [...expert.knowledgeBases],
            systemPrompt: expert.systemPrompt,
        })),
    };
    return JSON.stringify(exportData, null, 2);
}

/**
 * 导出专家为 Markdown 格式（可读性更好）
 */
export function exportExpertToMarkdown(expert: Expert): string {
    return `# ${expert.avatar} ${expert.name}

## 基本信息
- **领域**: ${expert.domain}
- **描述**: ${expert.description}

## 专业能力
${expert.capabilities.map(cap => `- ${cap}`).join('\n')}

## 可用工具
${expert.tools.map(tool => `- ${tool}`).join('\n')}

## 关联知识库
${expert.knowledgeBases.length > 0 ? expert.knowledgeBases.map(kb => `- ${kb}`).join('\n') : '- 无'}

## 系统提示词
\`\`\`
${expert.systemPrompt}
\`\`\`

---
*导出时间: ${new Date().toLocaleString('zh-CN')}*
`;
}

/**
 * 验证导入的专家数据
 */
export function validateImportData(data: unknown): { valid: boolean; error?: string; config?: ExpertConfig } {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: '无效的数据格式' };
    }

    const obj = data as Record<string, unknown>;

    // 检查版本
    if (obj.version !== '1.0') {
        return { valid: false, error: '不支持的版本格式' };
    }

    // 检查专家数据
    const expert = obj.expert as Record<string, unknown> | undefined;
    if (!expert) {
        return { valid: false, error: '缺少专家数据' };
    }

    // 验证必需字段
    const requiredFields = ['name', 'domain', 'description', 'systemPrompt'];
    for (const field of requiredFields) {
        if (typeof expert[field] !== 'string' || !expert[field]) {
            return { valid: false, error: `缺少必需字段: ${field}` };
        }
    }

    // 验证数组字段
    const arrayFields = ['capabilities', 'tools', 'knowledgeBases'];
    for (const field of arrayFields) {
        if (!Array.isArray(expert[field])) {
            return { valid: false, error: `字段 ${field} 必须是数组` };
        }
    }

    return {
        valid: true,
        config: {
            name: expert.name as string,
            avatar: (expert.avatar as string) || '🤖',
            domain: expert.domain as string,
            description: expert.description as string,
            capabilities: expert.capabilities as string[],
            tools: expert.tools as string[],
            knowledgeBases: expert.knowledgeBases as string[],
            systemPrompt: expert.systemPrompt as string,
        },
    };
}

/**
 * 验证批量导入数据
 */
export function validateBatchImportData(data: unknown): { valid: boolean; error?: string; configs?: ExpertConfig[] } {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: '无效的数据格式' };
    }

    const obj = data as Record<string, unknown>;

    if (obj.version !== '1.0') {
        return { valid: false, error: '不支持的版本格式' };
    }

    const experts = obj.experts as unknown[];
    if (!Array.isArray(experts) || experts.length === 0) {
        return { valid: false, error: '缺少专家数据或数据为空' };
    }

    const configs: ExpertConfig[] = [];

    for (let i = 0; i < experts.length; i++) {
        const expert = experts[i] as Record<string, unknown>;

        const requiredFields = ['name', 'domain', 'description', 'systemPrompt'];
        for (const field of requiredFields) {
            if (typeof expert[field] !== 'string' || !expert[field]) {
                return { valid: false, error: `专家 ${i + 1} 缺少必需字段: ${field}` };
            }
        }

        configs.push({
            name: expert.name as string,
            avatar: (expert.avatar as string) || '🤖',
            domain: expert.domain as string,
            description: expert.description as string,
            capabilities: (expert.capabilities as string[]) || [],
            tools: (expert.tools as string[]) || [],
            knowledgeBases: (expert.knowledgeBases as string[]) || [],
            systemPrompt: expert.systemPrompt as string,
        });
    }

    return { valid: true, configs };
}

/**
 * 从配置创建专家对象
 */
export function createExpertFromConfig(config: ExpertConfig): Omit<Expert, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
    return {
        name: config.name,
        avatar: config.avatar,
        domain: config.domain,
        description: config.description,
        capabilities: [...config.capabilities],
        tools: [...config.tools],
        knowledgeBases: [...config.knowledgeBases],
        systemPrompt: config.systemPrompt,
        usageCount: 0,
        isSystem: false,
        status: 'active',
    };
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * 读取上传的文件
 */
export function readUploadedFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
    });
}

/**
 * 生成分享链接（Base64编码）
 */
export function generateShareLink(expert: Expert): string {
    const config: ExpertConfig = {
        name: expert.name,
        avatar: expert.avatar,
        domain: expert.domain,
        description: expert.description,
        capabilities: expert.capabilities,
        tools: expert.tools,
        knowledgeBases: expert.knowledgeBases,
        systemPrompt: expert.systemPrompt,
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(config)));
    return `${window.location.origin}/import?expert=${encoded}`;
}

/**
 * 解析分享链接
 */
export function parseShareLink(link: string): ExpertConfig | null {
    try {
        const url = new URL(link);
        const encoded = url.searchParams.get('expert');
        if (!encoded) return null;

        const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
        return decoded as ExpertConfig;
    } catch {
        return null;
    }
}
