/**
 * 知识库管理 API 服务
 * 用于对接外部文献与数据库平台
 */

// API 配置
export interface KnowledgeAPIConfig {
    baseUrl: string;
    apiKey?: string;
    timeout?: number;
}

// 知识库类型
export interface KnowledgeBase {
    id: string;
    name: string;
    description: string;
    type: 'literature' | 'database' | 'document' | 'custom';
    source: string;           // 数据来源 (e.g., 'pubmed', 'cnki', 'custom')
    documentCount: number;
    lastSyncAt: string;
    status: 'active' | 'syncing' | 'error' | 'offline';
    icon?: string;
    metadata?: Record<string, unknown>;
}

// 文献/文档类型
export interface Document {
    id: string;
    title: string;
    abstract?: string;
    authors?: string[];
    source: string; // 期刊或来源
    publishDate?: string; // 统一日期字段
    doi?: string;
    url?: string;
    keywords?: string[];
    citations?: number;
    type: 'paper' | 'patent' | 'report' | 'book' | 'other';
    knowledgeBaseId: string;

    // UI 扩展字段
    status?: 'pending' | 'parsing' | 'indexed' | 'error';
    fileType?: 'pdf' | 'docx' | 'txt' | 'md';
    fileSize?: number;
    uploadedAt?: string;
    parsedAt?: string;
    features?: DocumentFeature[];
}

export interface DocumentFeature {
    id: string;
    type: 'method' | 'finding' | 'material' | 'outcome' | 'metric';
    label: string;
    value: string;
    confidence: number;
    source: string;
}

// 材料属性
export interface MaterialProperty {
    name: string;
    value: number | string;
    unit?: string;
    testCondition?: string;
    confidence?: number;
}

// 材料数据
// 材料数据
export interface Material {
    id: string;
    name: string;
    category: string;
    subcategory?: string;
    abbreviation?: string; // New
    properties: MaterialProperty[];
    composition?: Record<string, number>;

    // Function & Application
    functional_role?: string; // New
    applications: string[];

    // Source Tracking
    source_doc_ids?: string[]; // New
    paper_count?: number; // New
    sources?: string[]; // Deprecated, keep for compatibility

    metadata?: Record<string, unknown>; // New
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
}

// Prompt变量
export interface PromptVariable {
    name: string;
    type: 'text' | 'select' | 'number' | 'boolean' | 'json';
    description: string;
    defaultValue?: string;
    options?: string[];
    required: boolean;
}

// Prompt模板
export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    template: string;
    variables: PromptVariable[];
    version: number;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    usageCount: number;
}

// 搜索参数
export interface SearchParams {
    query: string;
    knowledgeBaseIds?: string[];
    filters?: {
        type?: string[];
        dateRange?: { start: string; end: string };
        authors?: string[];
        source?: string[];
    };
    page?: number;
    pageSize?: number;
    sortBy?: 'relevance' | 'date' | 'citations';
}

// 搜索结果
export interface SearchResult {
    documents: Document[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// API 响应封装
interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

/**
 * 知识库 API 服务类
 */
class KnowledgeAPIService {
    private config: KnowledgeAPIConfig;

    constructor(config: KnowledgeAPIConfig) {
        this.config = {
            timeout: 30000,
            ...config,
        };
    }

    /**
     * 设置 API 配置
     */
    setConfig(config: Partial<KnowledgeAPIConfig>) {
        this.config = { ...this.config, ...config };
    }

    /**
     * 通用请求方法
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<APIResponse<T>> {
        try {
            const url = `${this.config.baseUrl}${endpoint}`;
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...((options.headers as Record<string, string>) || {}),
            };

            if (this.config.apiKey) {
                headers['Authorization'] = `Bearer ${this.config.apiKey}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                this.config.timeout
            );

            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            const message = error instanceof Error ? error.message : '未知错误';
            console.error(`Knowledge API Error: ${message}`);
            return { success: false, error: message };
        }
    }

    /**
     * 获取知识库列表
     */
    async getKnowledgeBases(): Promise<APIResponse<KnowledgeBase[]>> {
        return this.request<KnowledgeBase[]>('/knowledge-bases');
    }

    /**
     * 获取单个知识库详情
     */
    async getKnowledgeBase(id: string): Promise<APIResponse<KnowledgeBase>> {
        return this.request<KnowledgeBase>(`/knowledge-bases/${id}`);
    }

    /**
     * 搜索文档
     */
    async searchDocuments(params: SearchParams): Promise<APIResponse<SearchResult>> {
        return this.request<SearchResult>('/documents/search', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    /**
     * 获取文档详情
     */
    async getDocument(id: string): Promise<APIResponse<Document>> {
        return this.request<Document>(`/documents/${id}`);
    }

    /**
     * 获取推荐文档
     */
    async getRecommendations(
        documentId: string,
        limit?: number
    ): Promise<APIResponse<Document[]>> {
        const query = limit ? `?limit=${limit}` : '';
        return this.request<Document[]>(`/documents/${documentId}/recommendations${query}`);
    }

    /**
     * 同步知识库
     */
    async syncKnowledgeBase(id: string): Promise<APIResponse<{ taskId: string }>> {
        return this.request<{ taskId: string }>(`/knowledge-bases/${id}/sync`, {
            method: 'POST',
        });
    }

    /**
     * 检查 API 连接状态
     */
    async checkConnection(): Promise<boolean> {
        try {
            const response = await this.request('/health');
            return response.success;
        } catch {
            return false;
        }
    }
    /**
     * 获取材料列表
     */
    async getMaterials(params: {
        query?: string;
        category?: string;
        subcategory?: string;
        hasPaper?: boolean;
        sortBy?: string;
        sortOrder?: string;
        page?: number;
        pageSize?: number;
    }): Promise<APIResponse<{ materials: Material[]; total: number; page: number; pageSize: number; hasMore: boolean }>> {
        const queryParams = new URLSearchParams();
        if (params.query) queryParams.append('query', params.query);
        if (params.category) queryParams.append('category', params.category);
        if (params.subcategory) queryParams.append('subcategory', params.subcategory);
        if (params.hasPaper !== undefined) queryParams.append('hasPaper', params.hasPaper.toString());
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

        return this.request<{ materials: Material[]; total: number; page: number; pageSize: number; hasMore: boolean }>(
            `/materials?${queryParams.toString()}`
        );
    }

    /**
     * 获取单个材料
     */
    async getMaterial(id: string): Promise<APIResponse<Material>> {
        return this.request<Material>(`/materials/${id}`);
    }

    /**
     * 获取材料统计
     */
    async getMaterialStats(): Promise<APIResponse<{ totalMaterials: number; totalAssemblies: number; categories: { category: string; count: number }[] }>> {
        return this.request('/materials/stats');
    }
}

// 默认配置 (可在运行时修改)
const defaultConfig: KnowledgeAPIConfig = {
    baseUrl: import.meta.env.VITE_KNOWLEDGE_API_URL || '/api/v1',
    apiKey: import.meta.env.VITE_KNOWLEDGE_API_KEY || '',
};

// 导出单例实例
export const knowledgeAPI = new KnowledgeAPIService(defaultConfig);

// 导出类以便创建多个实例
export { KnowledgeAPIService };

// ============ Mock 数据 (用于开发测试) ============

export const MOCK_KNOWLEDGE_BASES: KnowledgeBase[] = [
    {
        id: 'kb-pubmed',
        name: 'PubMed 生物医学文献库',
        description: '包含生物医学和生命科学期刊的文献摘要和全文链接',
        type: 'literature',
        source: 'pubmed',
        documentCount: 35000000,
        lastSyncAt: '2024-01-15T10:00:00Z',
        status: 'active',
        icon: '📚',
    },
    {
        id: 'kb-cnki',
        name: 'CNKI 中国知网',
        description: '中国最大的学术文献数据库，涵盖期刊、博硕士论文等',
        type: 'literature',
        source: 'cnki',
        documentCount: 8500000,
        lastSyncAt: '2024-01-14T08:00:00Z',
        status: 'active',
        icon: '📖',
    },
    {
        id: 'kb-biomaterials',
        name: '生物材料专题库',
        description: '生物材料领域的专业文献和数据集',
        type: 'database',
        source: 'custom',
        documentCount: 125000,
        lastSyncAt: '2024-01-13T12:00:00Z',
        status: 'active',
        icon: '🧬',
    },
    {
        id: 'kb-wound-care',
        name: '创面护理知识库',
        description: '创面护理相关的临床指南、护理方案和研究文献',
        type: 'document',
        source: 'custom',
        documentCount: 3500,
        lastSyncAt: '2024-01-12T16:00:00Z',
        status: 'active',
        icon: '🩹',
    },
    {
        id: 'kb-patents',
        name: '医疗器械专利库',
        description: '医疗器械和生物材料相关的国内外专利数据',
        type: 'database',
        source: 'patent-db',
        documentCount: 450000,
        lastSyncAt: '2024-01-10T09:00:00Z',
        status: 'active',
        icon: '📋',
    },
];

export const MOCK_DOCUMENTS: Document[] = [
    {
        id: 'doc-1',
        title: 'Advances in Hydrogel-Based Wound Dressings for Chronic Wound Healing',
        authors: ['Zhang Y.', 'Wang L.', 'Chen H.'],
        abstract: 'This comprehensive review discusses recent advances in hydrogel-based wound dressings, focusing on their application in chronic wound healing. We examine the mechanisms of action, biocompatibility, and clinical outcomes of various hydrogel formulations...',
        source: 'Biomaterials Science',
        publishDate: '2024-03-15',
        doi: '10.1039/D4BM00123A',
        keywords: ['hydrogel', 'wound healing', 'chronic wounds', 'biomaterials'],
        knowledgeBaseId: 'kb-biomaterials',
        citations: 45,
        type: 'paper',
        status: 'indexed',
        fileType: 'pdf',
        fileSize: 2456789,
        uploadedAt: '2024-03-20T10:30:00Z',
        parsedAt: '2024-03-20T10:35:00Z',
        features: [
            { id: 'f1', type: 'finding', label: '愈合效果', value: '加速愈合40%', confidence: 0.92, source: 'Results section' },
            { id: 'f2', type: 'material', label: '主要材料', value: 'PEG-based hydrogel', confidence: 0.98, source: 'Methods' },
        ]
    },
    {
        id: 'doc-2',
        title: 'Nanoparticle-Enhanced Scaffolds for Tissue Regeneration in Diabetic Wounds',
        authors: ['Li M.', 'Johnson R.', 'Smith K.'],
        abstract: 'Diabetic wounds present unique challenges in tissue regeneration. This study investigates the use of nanoparticle-enhanced scaffolds to promote healing in diabetic wound models...',
        source: 'Advanced Healthcare Materials',
        publishDate: '2024-02-28',
        doi: '10.1002/adhm.202400567',
        keywords: ['nanoparticles', 'scaffold', 'diabetic wounds', 'tissue regeneration'],
        knowledgeBaseId: 'kb-wound-care',
        citations: 23,
        type: 'paper',
        status: 'indexed',
        fileType: 'pdf',
        fileSize: 3145678,
        uploadedAt: '2024-03-01T14:20:00Z',
        parsedAt: '2024-03-01T14:28:00Z',
    },
    {
        id: 'doc-3',
        title: 'Clinical Trial Results: Bioactive Glass Particles in Wound Care',
        authors: ['Anderson P.', 'Liu X.', 'Brown T.'],
        abstract: 'This phase II clinical trial evaluates the efficacy and safety of bioactive glass particles integrated into wound dressings for the treatment of chronic venous ulcers...',
        source: 'Journal of Clinical Medicine',
        publishDate: '2024-01-10',
        doi: '10.3390/jcm13010345',
        keywords: ['bioactive glass', 'clinical trial', 'venous ulcers', 'wound care'],
        knowledgeBaseId: 'kb-pubmed',
        citations: 67,
        type: 'paper',
        status: 'indexed',
        fileType: 'pdf',
        fileSize: 1876543,
        uploadedAt: '2024-01-15T09:00:00Z',
        parsedAt: '2024-01-15T09:12:00Z',
    },
    {
        id: 'doc-4',
        title: 'Smart Hydrogels with Real-Time Wound Monitoring Capabilities',
        authors: ['Kim S.', 'Park J.', 'Lee H.'],
        abstract: 'We present a novel smart hydrogel system capable of real-time wound environment monitoring, including pH, temperature, and bacterial infection detection...',
        source: 'Nature Communications',
        publishDate: '2024-04-01',
        doi: '10.1038/s41467-024-12345-x',
        keywords: ['smart materials', 'wound monitoring', 'biosensors', 'hydrogels'],
        knowledgeBaseId: 'kb-biomaterials',
        citations: 12,
        type: 'paper',
        status: 'parsing',
        fileType: 'pdf',
        fileSize: 4567890,
        uploadedAt: '2024-04-05T16:45:00Z',
    },
    {
        id: 'doc-5',
        title: 'Antimicrobial Peptide-Loaded Nanofibers for Infected Wound Treatment',
        authors: ['Garcia M.', 'Wilson A.'],
        abstract: 'This research explores the development of electrospun nanofibers loaded with antimicrobial peptides for the treatment of infected chronic wounds...',
        source: 'ACS Applied Materials & Interfaces',
        publishDate: '2023-12-20',
        doi: '10.1021/acsami.3c15678',
        keywords: ['antimicrobial peptides', 'nanofibers', 'infection', 'electrospinning'],
        knowledgeBaseId: 'kb-wound-care',
        citations: 89,
        type: 'paper',
        status: 'indexed',
        fileType: 'pdf',
        fileSize: 2987654,
        uploadedAt: '2023-12-25T11:30:00Z',
        parsedAt: '2023-12-25T11:42:00Z',
    },
];

/**
 * Mock API 服务 (用于开发测试)
 */
export const mockKnowledgeAPI = {
    async getKnowledgeBases(): Promise<APIResponse<KnowledgeBase[]>> {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, data: MOCK_KNOWLEDGE_BASES };
    },

    async searchDocuments(params: SearchParams): Promise<APIResponse<SearchResult>> {
        await new Promise(resolve => setTimeout(resolve, 800));
        let filtered = MOCK_DOCUMENTS.filter(doc =>
            doc.title.toLowerCase().includes(params.query.toLowerCase()) ||
            doc.abstract?.toLowerCase().includes(params.query.toLowerCase())
        );

        if (params.knowledgeBaseIds && params.knowledgeBaseIds.length > 0) {
            filtered = filtered.filter(doc =>
                params.knowledgeBaseIds?.includes(doc.knowledgeBaseId)
            );
        }

        return {
            success: true,
            data: {
                documents: filtered,
                total: filtered.length,
                page: params.page || 1,
                pageSize: params.pageSize || 10,
                hasMore: false,
            },
        };
    },

    async getDocument(id: string): Promise<APIResponse<Document>> {
        await new Promise(resolve => setTimeout(resolve, 300));
        const doc = MOCK_DOCUMENTS.find(d => d.id === id);
        if (doc) {
            return { success: true, data: doc };
        }
        return { success: false, error: 'Document not found' };
    },

    /**
     * Get Materials List
     */
    async getMaterials(params: {
        query?: string;
        category?: string;
        subcategory?: string;
        functionalRole?: string;
        page?: number;
        pageSize?: number;
    }): Promise<APIResponse<{ materials: Material[]; total: number; page: number; pageSize: number; hasMore: boolean }>> {
        // Mock implementation for fallback
        const query = params.query || '';
        let filtered = MOCK_MATERIALS.filter(mat =>
            (query && (mat.name.toLowerCase().includes(query.toLowerCase()) ||
                mat.applications.some(a => a.toLowerCase().includes(query.toLowerCase())) ||
                mat.properties.some(p => p.name.toLowerCase().includes(query.toLowerCase())))) || !query
        );

        if (params.category) {
            filtered = filtered.filter(mat => mat.category === params.category);
        }
        if (params.subcategory) {
            filtered = filtered.filter(mat => mat.subcategory === params.subcategory);
        }
        if (params.functionalRole) {
            filtered = filtered.filter(mat => mat.functional_role === params.functionalRole);
        }

        const page = params.page || 1;
        const pageSize = params.pageSize || 10;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginated = filtered.slice(start, end);

        return {
            success: true,
            data: {
                materials: paginated,
                total: filtered.length,
                page: page,
                pageSize: pageSize,
                hasMore: end < filtered.length,
            },
        };
    },

    /**
     * Get Single Material
     */
    async getMaterial(id: string): Promise<APIResponse<Material>> {
        await new Promise(resolve => setTimeout(resolve, 300));
        const mat = MOCK_MATERIALS.find(m => m.id === id);
        if (mat) {
            return { success: true, data: mat };
        }
        return { success: false, error: 'Material not found' };
    },

    /**
     * Get Material Stats
     */
    async getMaterialStats(): Promise<APIResponse<{ totalMaterials: number; totalAssemblies: number; categories: { category: string; count: number }[] }>> {
        await new Promise(resolve => setTimeout(resolve, 300));
        const totalMaterials = MOCK_MATERIALS.length;
        const totalAssemblies = 0; // Mock value
        const categoryCounts: Record<string, number> = {};
        MOCK_MATERIALS.forEach(mat => {
            categoryCounts[mat.category] = (categoryCounts[mat.category] || 0) + 1;
        });
        const categories = Object.entries(categoryCounts).map(([category, count]) => ({ category, count }));

        return {
            success: true,
            data: {
                totalMaterials,
                totalAssemblies,
                categories,
            },
        };
    },

    async getTemplates(params: { query: string; categoryId?: string }): Promise<APIResponse<PromptTemplate[]>> {
        await new Promise(resolve => setTimeout(resolve, 600));
        let filtered = MOCK_TEMPLATES.filter(tpl =>
            tpl.name.toLowerCase().includes(params.query.toLowerCase()) ||
            tpl.description.toLowerCase().includes(params.query.toLowerCase()) ||
            tpl.variables.some(v => v.name.toLowerCase().includes(params.query.toLowerCase()))
        );

        if (params.categoryId && params.categoryId.startsWith('tpl-')) {
            filtered = filtered.filter(tpl => tpl.category === params.categoryId);
        }

        return { success: true, data: filtered };
    },

    async getTemplate(id: string): Promise<APIResponse<PromptTemplate>> {
        await new Promise(resolve => setTimeout(resolve, 300));
        const tpl = MOCK_TEMPLATES.find(t => t.id === id);
        if (tpl) {
            return { success: true, data: tpl };
        }
        return { success: false, error: 'Template not found' };
    },
};

// ============ Mock 材料数据 ============

export const MOCK_MATERIALS: Material[] = [
    {
        id: 'mat-1',
        name: 'PEG-DA 水凝胶',
        category: 'mat-hydrogel',
        subcategory: '合成高分子',
        properties: [
            { name: '分子量', value: 6000, unit: 'Da' },
            { name: '溶胀率', value: 850, unit: '%' },
            { name: '弹性模量', value: 15, unit: 'kPa' },
            { name: '降解时间', value: '2-4', unit: '周' },
        ],
        applications: ['创面敷料', '药物递送', '细胞封装'],
        sources: ['doc-1', 'doc-4'],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-03-20T14:30:00Z',
    },
    {
        id: 'mat-2',
        name: '胶原蛋白-透明质酸复合支架',
        category: 'mat-scaffold',
        subcategory: '天然高分子',
        properties: [
            { name: '孔隙率', value: 92, unit: '%' },
            { name: '孔径', value: '100-200', unit: 'μm' },
            { name: '压缩强度', value: 45, unit: 'kPa' },
            { name: '含水量', value: 85, unit: '%' },
        ],
        applications: ['皮肤再生', '软骨修复', '创面愈合'],
        sources: ['doc-2', 'doc-3'],
        createdAt: '2024-02-10T09:00:00Z',
        updatedAt: '2024-03-18T11:20:00Z',
    },
    {
        id: 'mat-3',
        name: '银纳米颗粒 (AgNPs)',
        category: 'mat-nanoparticle',
        subcategory: '金属纳米材料',
        properties: [
            { name: '粒径', value: '20-50', unit: 'nm' },
            { name: 'Zeta电位', value: -25, unit: 'mV' },
            { name: 'MIC (大肠杆菌)', value: 5, unit: 'μg/mL' },
            { name: 'MIC (金葡菌)', value: 8, unit: 'μg/mL' },
        ],
        applications: ['抗菌涂层', '感染控制', '敷料添加剂'],
        sources: ['doc-5'],
        createdAt: '2024-01-20T15:00:00Z',
        updatedAt: '2024-02-28T16:45:00Z',
    },
    {
        id: 'mat-4',
        name: 'PLGA 微球',
        category: 'mat-nanoparticle',
        subcategory: '聚合物载体',
        properties: [
            { name: '粒径', value: '5-15', unit: 'μm' },
            { name: '包封率', value: 78, unit: '%' },
            { name: '药物装载量', value: 12, unit: '%' },
            { name: '释放周期', value: 28, unit: '天' },
        ],
        applications: ['生长因子递送', '抗生素缓释', '创面治疗'],
        sources: ['doc-6'],
        createdAt: '2024-02-05T10:30:00Z',
        updatedAt: '2024-03-15T09:15:00Z',
    },
    {
        id: 'mat-5',
        name: '海藻酸钠-壳聚糖水凝胶',
        category: 'mat-hydrogel',
        subcategory: '天然高分子',
        properties: [
            { name: '凝胶时间', value: 30, unit: '秒' },
            { name: '粘度', value: 1500, unit: 'cP' },
            { name: 'pH敏感范围', value: '5-8', unit: '' },
            { name: '生物降解性', value: '是', unit: '' },
        ],
        applications: ['止血敷料', '原位成胶', '细胞载体'],
        sources: ['doc-1', 'doc-2'],
        createdAt: '2024-03-01T14:00:00Z',
        updatedAt: '2024-03-25T10:00:00Z',
    },
    {
        id: 'mat-6',
        name: '氧化锌纳米线',
        category: 'mat-nanoparticle',
        subcategory: '金属氧化物',
        properties: [
            { name: '直径', value: '30-80', unit: 'nm' },
            { name: '长度', value: '1-5', unit: 'μm' },
            { name: '比表面积', value: 45, unit: 'm²/g' },
            { name: '抗菌效果', value: '优秀', unit: '' },
        ],
        applications: ['抗菌材料', '光催化', 'UV防护'],
        sources: ['doc-3'],
        createdAt: '2024-02-20T11:00:00Z',
        updatedAt: '2024-03-10T15:30:00Z',
    },
];

// ============ Mock 模板数据 ============

export const MOCK_TEMPLATES: PromptTemplate[] = [
    {
        id: 'tpl-1',
        name: '材料属性分析',
        description: '基于文献综合分析材料的物理化学性质和生物相容性',
        category: 'tpl-analysis',
        template: `作为生物材料专家，请分析以下材料的属性：

**材料名称**: {{material_name}}
**分析维度**: {{analysis_dimensions}}

请从以下角度进行分析：
1. 物理化学性质
2. 生物相容性评估
3. 降解特性
4. 临床应用潜力

参考文献：
{{references}}`,
        variables: [
            { name: 'material_name', type: 'text', description: '待分析的材料名称', required: true },
            { name: 'analysis_dimensions', type: 'select', description: '分析维度', options: ['全面分析', '物化性质', '生物性能', '临床转化'], required: true },
            { name: 'references', type: 'json', description: '参考文献列表', required: false },
        ],
        version: 3,
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-03-15T14:30:00Z',
        isActive: true,
        usageCount: 156,
    },
    {
        id: 'tpl-2',
        name: '创面愈合方案合成',
        description: '根据患者情况和创面特征生成个性化治疗方案',
        category: 'tpl-synthesis',
        template: `作为创面愈合专家，请根据以下信息制定治疗方案：

**患者信息**:
- 年龄: {{patient_age}}
- 基础疾病: {{underlying_conditions}}

**创面特征**:
- 类型: {{wound_type}}
- 面积: {{wound_area}}
- 深度: {{wound_depth}}
- 感染状态: {{infection_status}}

请提供：
1. 推荐敷料类型及更换频率
2. 辅助治疗建议
3. 预期愈合时间
4. 随访要点`,
        variables: [
            { name: 'patient_age', type: 'number', description: '患者年龄', required: true },
            { name: 'underlying_conditions', type: 'text', description: '基础疾病', required: false },
            { name: 'wound_type', type: 'select', description: '创面类型', options: ['压疮', '糖尿病足溃疡', '静脉溃疡', '烧伤', '手术切口', '其他'], required: true },
            { name: 'wound_area', type: 'text', description: '创面面积(cm²)', required: true },
            { name: 'wound_depth', type: 'select', description: '创面深度', options: ['表浅', '部分皮层', '全层', '深部组织'], required: true },
            { name: 'infection_status', type: 'select', description: '感染状态', options: ['无感染', '疑似感染', '确诊感染', '感染控制中'], required: true },
        ],
        version: 5,
        createdAt: '2024-01-05T09:00:00Z',
        updatedAt: '2024-03-20T11:00:00Z',
        isActive: true,
        usageCount: 289,
    },
    {
        id: 'tpl-3',
        name: '文献检索查询',
        description: '构建结构化的生物医学文献检索查询',
        category: 'tpl-query',
        template: `请构建针对以下研究问题的文献检索策略：

**研究问题**: {{research_question}}
**检索范围**: {{search_scope}}
**时间限制**: {{time_range}}

需要生成：
1. PubMed检索式
2. 检索关键词及同义词
3. MeSH术语建议
4. 预期结果数量评估`,
        variables: [
            { name: 'research_question', type: 'text', description: '研究问题描述', required: true },
            { name: 'search_scope', type: 'select', description: '检索范围', options: ['临床研究', '基础研究', '综述', '全部'], required: true },
            { name: 'time_range', type: 'select', description: '发表时间范围', options: ['近1年', '近3年', '近5年', '近10年', '不限'], required: false, defaultValue: '近5年' },
        ],
        version: 2,
        createdAt: '2024-02-01T15:00:00Z',
        updatedAt: '2024-03-10T10:00:00Z',
        isActive: true,
        usageCount: 127,
    },
    {
        id: 'tpl-4',
        name: '材料对比分析',
        description: '对多种材料进行系统性对比分析',
        category: 'tpl-analysis',
        template: `请对以下材料进行系统性对比分析：

**材料列表**:
{{materials_list}}

**对比维度**:
{{comparison_dimensions}}

请生成对比表格，包含：
1. 各项性能指标对比
2. 优缺点分析
3. 适用场景推荐
4. 成本效益评估`,
        variables: [
            { name: 'materials_list', type: 'json', description: '待对比材料列表', required: true },
            { name: 'comparison_dimensions', type: 'select', description: '对比维度', options: ['物化性质', '生物性能', '临床效果', '成本效益', '全面对比'], required: true },
        ],
        version: 1,
        createdAt: '2024-03-01T10:00:00Z',
        updatedAt: '2024-03-01T10:00:00Z',
        isActive: true,
        usageCount: 45,
    },
    {
        id: 'tpl-5',
        name: '研究摘要生成',
        description: '为研究论文生成结构化摘要',
        category: 'tpl-synthesis',
        template: `请为以下研究内容生成结构化摘要：

**研究标题**: {{paper_title}}
**研究内容**: 
{{paper_content}}

请按以下结构生成摘要：
- 背景 (Background)
- 方法 (Methods)
- 结果 (Results)
- 结论 (Conclusion)

字数限制: {{word_limit}} 字`,
        variables: [
            { name: 'paper_title', type: 'text', description: '论文标题', required: true },
            { name: 'paper_content', type: 'text', description: '论文主体内容', required: true },
            { name: 'word_limit', type: 'number', description: '字数限制', required: false, defaultValue: '300' },
        ],
        version: 2,
        createdAt: '2024-02-15T09:00:00Z',
        updatedAt: '2024-03-05T16:00:00Z',
        isActive: true,
        usageCount: 98,
    },
    {
        id: 'tpl-6',
        name: '意图识别分析',
        description: '识别用户查询的意图并进行分类',
        category: 'tpl-query',
        template: `请分析以下用户查询的意图：

**用户查询**: {{user_query}}
**上下文信息**: {{context}}

请识别：
1. 主要意图类型（信息查询/材料推荐/方案设计/对比分析）
2. 关键实体提取
3. 查询复杂度评估
4. 推荐的处理流程`,
        variables: [
            { name: 'user_query', type: 'text', description: '用户原始查询', required: true },
            { name: 'context', type: 'json', description: '对话上下文', required: false },
        ],
        version: 4,
        createdAt: '2024-01-20T11:00:00Z',
        updatedAt: '2024-03-18T09:30:00Z',
        isActive: true,
        usageCount: 412,
    },
];
