/**
 * BioExtract 后端 API 服务层
 * 
 * 封装所有与后端 MongoDB API 的交互
 * 替代原来的 SQLite 数据库操作
 */

// 使用相对路径以便通过本机 IP 或公网代理访问时 API 走同源并由 Vite 代理到后端
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// =============================================
// 类型定义
// =============================================

export interface Material {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    paper_count: number;
    source_doc_ids: string[];
    paper_titles: string[];
    properties: Array<{ name: string; value: string }>;
    applications: string[];
    functional_role: string;
    composition?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface Document {
    id: string;
    title: string;
    authors: string[];
    source: string;
    publishDate: string;
    type: string;
    knowledgeBaseId: string;
    status: string;
    markdown_url?: string;
    has_markdown: boolean;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    has_more: boolean;
}

export interface BioExtractStats {
    delivery_count: number;
    micro_count: number;
    paper_count: number;
    atps_count: number;
}

// =============================================
// API 调用封装
// =============================================

class BioExtractBackendAPI {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl || '/api/v1';
    }

    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // =============================================
    // 材料查询 API
    // =============================================

    /**
     * 搜索生物材料
     */
    async searchMaterials(params: {
        query?: string;
        category?: string;
        subcategory?: string;
        sortBy?: string;
        sortOrder?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{ materials: Material[]; total: number; hasMore: boolean }> {
        const queryParams = new URLSearchParams();
        if (params.query) queryParams.append('query', params.query);
        if (params.category) queryParams.append('category', params.category);
        if (params.subcategory) queryParams.append('subcategory', params.subcategory);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        queryParams.append('page', String(params.page || 1));
        queryParams.append('pageSize', String(params.pageSize || 20));

        // API 返回 { materials, total, hasMore }（或兼容 items）
        const response = await this.request<{ materials?: Material[]; items?: Material[]; total: number; hasMore: boolean }>(
            `/materials?${queryParams.toString()}`
        );

        return {
            materials: response.materials ?? response.items ?? [],
            total: response.total,
            hasMore: response.hasMore,
        };
    }

    /**
     * 获取单个材料详情
     */
    async getMaterial(id: string): Promise<Material> {
        return this.request<Material>(`/materials/${encodeURIComponent(id)}`);
    }

    /**
     * 获取材料分类统计
     */
    async getMaterialCategories(): Promise<Array<{ category: string; count: number }>> {
        return this.request<Array<{ category: string; count: number }>>('/materials/categories');
    }

    // =============================================
    // 文献查询 API
    // =============================================

    /**
     * 搜索文献
     */
    async searchDocuments(params: {
        query?: string;
        knowledgeBaseIds?: string[];
        page?: number;
        pageSize?: number;
    }): Promise<{ documents: Document[]; total: number; hasMore: boolean }> {
        const queryParams = new URLSearchParams();
        if (params.query) queryParams.append('query', params.query);
        if (params.knowledgeBaseIds?.length) {
            params.knowledgeBaseIds.forEach(id => queryParams.append('knowledge_base_ids', id));
        }
        queryParams.append('page', String(params.page || 1));
        queryParams.append('pageSize', String(params.pageSize || 20));

        return this.request<{ documents: Document[]; total: number; hasMore: boolean }>(
            `/documents/search?${queryParams.toString()}`
        );
    }

    // =============================================
    // BioExtract 专用 API
    // =============================================

    /**
     * 查询递送系统
     */
    async getDeliverySystems(params: {
        keyword?: string;
        paperId?: string;
        page?: number;
        pageSize?: number;
    }): Promise<PaginatedResponse<Material>> {
        const queryParams = new URLSearchParams();
        if (params.keyword) queryParams.append('keyword', params.keyword);
        if (params.paperId) queryParams.append('paper_id', params.paperId);
        queryParams.append('page', String(params.page || 1));
        queryParams.append('page_size', String(params.pageSize || 20));

        return this.request<PaginatedResponse<Material>>(
            `/bioextract/delivery-systems?${queryParams.toString()}`
        );
    }

    /**
     * 查询微生物特征
     */
    async getMicroFeatures(params: {
        keyword?: string;
        paperId?: string;
        page?: number;
        pageSize?: number;
    }): Promise<PaginatedResponse<Material>> {
        const queryParams = new URLSearchParams();
        if (params.keyword) queryParams.append('keyword', params.keyword);
        if (params.paperId) queryParams.append('paper_id', params.paperId);
        queryParams.append('page', String(params.page || 1));
        queryParams.append('page_size', String(params.pageSize || 20));

        return this.request<PaginatedResponse<Material>>(
            `/bioextract/micro-features?${queryParams.toString()}`
        );
    }

    /**
     * 获取论文 Markdown 内容
     */
    async getPaperMarkdown(paperId: string): Promise<{ content: string; paper_id: string }> {
        return this.request<{ content: string; paper_id: string }>(
            `/bioextract/papers/${encodeURIComponent(paperId)}/markdown`
        );
    }

    /**
     * 获取论文标签
     */
    async getPaperTags(params: {
        keyword?: string;
        classification?: string;
        page?: number;
        pageSize?: number;
    }): Promise<PaginatedResponse<Record<string, unknown>>> {
        const queryParams = new URLSearchParams();
        if (params.keyword) queryParams.append('keyword', params.keyword);
        if (params.classification) queryParams.append('l1_class', params.classification);
        queryParams.append('page', String(params.page || 1));
        queryParams.append('page_size', String(params.pageSize || 20));

        return this.request<PaginatedResponse<Record<string, unknown>>>(
            `/bioextract/paper-tags?${queryParams.toString()}`
        );
    }

    /**
     * 获取 BioExtract 统计信息
     */
    async getStats(): Promise<BioExtractStats> {
        return this.request<BioExtractStats>('/bioextract/stats');
    }

    // =============================================
    // 辅助方法
    // =============================================

    /**
     * 根据关键词智能搜索（材料 + 文献）
     */
    async smartSearch(keyword: string, limit: number = 10): Promise<{
        materials: Material[];
        documents: Document[];
    }> {
        const [materialsRes, documentsRes] = await Promise.all([
            this.searchMaterials({ query: keyword, pageSize: limit }),
            this.searchDocuments({ query: keyword, pageSize: limit }),
        ]);

        return {
            materials: materialsRes.materials,
            documents: documentsRes.documents,
        };
    }

    /**
     * 获取材料关联的文献
     */
    async getMaterialDocuments(materialName: string): Promise<Document[]> {
        // 先搜索材料获取 source_doc_ids
        const materials = await this.searchMaterials({ query: materialName, pageSize: 1 });
        if (materials.materials.length === 0) {
            return [];
        }

        const material = materials.materials[0];
        const docIds = material.source_doc_ids || [];

        // 这里可以批量获取文献，暂时使用搜索
        if (docIds.length === 0) return [];

        // 使用材料名称搜索相关文献
        const docsRes = await this.searchDocuments({ query: materialName, pageSize: 20 });
        return docsRes.documents;
    }
}

// 导出单例实例
export const bioextractAPI = new BioExtractBackendAPI();

export default bioextractAPI;
