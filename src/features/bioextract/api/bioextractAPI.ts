/**
 * BioExtract-AI Mock 数据 API
 * 模拟 ATPS 数据库和 Drug Delivery 标签库
 */

import type {
    ATPSRecord,
    PolymerCandidate,
    PolymerTag,
    Modifier,
    DrugDeliveryProfile,
    FilterCriteria,
    Recommendation,
    FunctionalTagType,
} from '../types';

// Helper function to get Authorization headers
function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// =============================================
// Mock ATPS 数据库 (示例数据)
// =============================================

export const MOCK_ATPS_RECORDS: ATPSRecord[] = [
    // PEG + Dextran 系列
    {
        id: 'atps-001',
        polymer1: 'PEG',
        polymer2: 'Dextran',
        polymer1MW: 6000,
        polymer2MW: 500000,
        polymer1Conc: 4.5,
        polymer2Conc: 7.0,
        temperature: 25,
        pH: 7.0,
        phaseFormation: true,
        topPhase: 'PEG',
        bottomPhase: 'Dextran',
        partitionCoefficient: 3.2,
        reference: 'Albertsson, 1986',
        doi: '10.1016/xxx',
    },
    {
        id: 'atps-002',
        polymer1: 'PEG',
        polymer2: 'Dextran',
        polymer1MW: 8000,
        polymer2MW: 500000,
        polymer1Conc: 5.0,
        polymer2Conc: 6.5,
        temperature: 25,
        pH: 7.0,
        phaseFormation: true,
        topPhase: 'PEG',
        bottomPhase: 'Dextran',
        partitionCoefficient: 4.1,
        reference: 'Walter et al., 1985',
    },
    {
        id: 'atps-003',
        polymer1: 'PEG',
        polymer2: 'Dextran',
        polymer1MW: 20000,
        polymer2MW: 500000,
        polymer1Conc: 4.0,
        polymer2Conc: 5.0,
        temperature: 25,
        pH: 7.4,
        phaseFormation: true,
        topPhase: 'PEG',
        bottomPhase: 'Dextran',
        partitionCoefficient: 5.8,
        reference: 'Zaslavsky, 1995',
    },
    // PVP + Dextran 系列
    {
        id: 'atps-101',
        polymer1: 'PVP',
        polymer2: 'Dextran',
        polymer1MW: 40000,
        polymer2MW: 500000,
        polymer1Conc: 8.0,
        polymer2Conc: 5.0,
        temperature: 25,
        pH: 7.0,
        phaseFormation: true,
        topPhase: 'PVP',
        bottomPhase: 'Dextran',
        partitionCoefficient: 2.1,
        reference: 'Johansson et al., 1998',
    },
    // EOPO + Dextran 系列
    {
        id: 'atps-201',
        polymer1: 'EOPO',
        polymer2: 'Dextran',
        polymer1MW: 3900,
        polymer2MW: 500000,
        polymer1Conc: 6.0,
        polymer2Conc: 4.0,
        temperature: 25,
        pH: 7.0,
        phaseFormation: true,
        topPhase: 'EOPO',
        bottomPhase: 'Dextran',
        partitionCoefficient: 2.8,
        reference: 'Persson et al., 1999',
    },
    // 更多 PEG + Dextran 记录 (模拟大量数据)
    ...Array.from({ length: 50 }, (_, i) => ({
        id: `atps-peg-${1000 + i}`,
        polymer1: 'PEG',
        polymer2: 'Dextran',
        polymer1MW: 4000 + Math.floor(Math.random() * 16000),
        polymer2MW: 500000,
        polymer1Conc: 3 + Math.random() * 5,
        polymer2Conc: 4 + Math.random() * 6,
        temperature: 25,
        pH: 6.5 + Math.random() * 1.5,
        phaseFormation: true,
        topPhase: 'PEG',
        bottomPhase: 'Dextran',
        partitionCoefficient: 2 + Math.random() * 5,
        reference: `Literature ${1000 + i}`,
    })),
];

// =============================================
// Mock Drug Delivery 标签库
// =============================================

export const MOCK_POLYMER_TAGS: PolymerTag[] = [
    // PEG 标签
    { polymerId: 'peg', polymerName: 'PEG', tag: 'pH_Stability', rating: 'excellent', conditions: 'pH 1-14 稳定' },
    { polymerId: 'peg', polymerName: 'PEG', tag: 'Enzyme_Resistance', rating: 'moderate', mechanism: '空间位阻效应' },
    { polymerId: 'peg', polymerName: 'PEG', tag: 'Biocompatibility', rating: 'excellent', mechanism: 'FDA 批准的生物相容性材料' },
    { polymerId: 'peg', polymerName: 'PEG', tag: 'Mucoadhesion', rating: 'poor', mechanism: '缺乏粘附基团' },
    { polymerId: 'peg', polymerName: 'PEG', tag: 'Controlled_Release', rating: 'moderate' },

    // PVP 标签
    { polymerId: 'pvp', polymerName: 'PVP', tag: 'pH_Stability', rating: 'good' },
    { polymerId: 'pvp', polymerName: 'PVP', tag: 'Biocompatibility', rating: 'good' },
    { polymerId: 'pvp', polymerName: 'PVP', tag: 'Mucoadhesion', rating: 'poor' },

    // Chitosan 标签
    { polymerId: 'chitosan', polymerName: 'Chitosan', tag: 'Mucoadhesion', rating: 'excellent', mechanism: '正电荷与粘膜负电荷结合' },
    { polymerId: 'chitosan', polymerName: 'Chitosan', tag: 'pH_Stability', rating: 'moderate', conditions: '酸性条件下溶解' },
    { polymerId: 'chitosan', polymerName: 'Chitosan', tag: 'Biodegradability', rating: 'excellent' },
];

export const MOCK_MODIFIERS: Modifier[] = [
    {
        id: 'mod-maa',
        name: 'MAA',
        fullName: 'Methacrylic Acid (甲基丙烯酸)',
        category: 'monomer',
        providedTags: ['pH_Stability', 'Controlled_Release', 'Site_Specific'],
        compatiblePolymers: ['PEG', 'PVP', 'HPMC'],
        mechanism: 'pH敏感性：酸性环境下收缩保护，碱性环境（肠道pH>7）溶胀释放',
        chemicalStructure: 'CH2=C(CH3)COOH',
        references: ['Lowman et al., 1999', 'Peppas et al., 2000'],
    },
    {
        id: 'mod-dopa',
        name: 'DOPA',
        fullName: 'L-3,4-dihydroxyphenylalanine (多巴/邻苯二酚)',
        category: 'functional_group',
        providedTags: ['Mucoadhesion', 'Site_Specific'],
        compatiblePolymers: ['PEG', 'PVP', 'Chitosan', 'Alginate'],
        mechanism: '仿贻贝粘附：邻苯二酚基团与组织蛋白形成共价键和氢键，提供强效湿态粘附',
        chemicalStructure: 'HO-C6H3(OH)-CH2-CH(NH2)-COOH',
        references: ['Lee et al., 2007', 'Waite et al., 2005'],
    },
    {
        id: 'mod-paa',
        name: 'PAA',
        fullName: 'Polyacrylic Acid (聚丙烯酸)',
        category: 'monomer',
        providedTags: ['pH_Stability', 'Mucoadhesion'],
        compatiblePolymers: ['PEG', 'PVP'],
        mechanism: 'pH响应性，羧基提供粘附位点',
        references: ['Khutoryanskiy et al., 2018'],
    },
    {
        id: 'mod-thiol',
        name: 'Thiol',
        fullName: 'Thiol Groups (巯基)',
        category: 'functional_group',
        providedTags: ['Mucoadhesion', 'Cell_Penetration'],
        compatiblePolymers: ['Chitosan', 'PEG', 'PAA'],
        mechanism: '与粘膜糖蛋白上的半胱氨酸残基形成二硫键',
        references: ['Bernkop-Schnürch et al., 2004'],
    },
];

// =============================================
// Mock API 服务
// =============================================

export const bioextractAPI = {
    /**
     * 根据内相聚合物筛选 ATPS 数据
     */
    async filterATPSByInnerPhase(innerPhase: string): Promise<{
        records: ATPSRecord[];
        candidates: PolymerCandidate[];
        totalRecords: number;
    }> {
        // Call backend API
        const response = await fetch(`/api/v1/bioextract/atps/filter?inner_phase=${encodeURIComponent(innerPhase)}`);
        if (!response.ok) {
            throw new Error('API call failed');
        }

        const data = await response.json();
        const matchedRecords: ATPSRecord[] = data.records;

        // Stats logic (keep frontend stats for now or move to backend completely)
        // For now, we process stats on frontend to keep compatibility with existing components
        const polymerStats = new Map<string, {
            count: number;
            records: ATPSRecord[];
            mws: number[];
        }>();

        matchedRecords.forEach(record => {
            const outerPhase = record.polymer1.toLowerCase() === innerPhase.toLowerCase()
                ? record.polymer2
                : record.polymer1;

            if (!polymerStats.has(outerPhase)) {
                polymerStats.set(outerPhase, { count: 0, records: [], mws: [] });
            }
            const stats = polymerStats.get(outerPhase)!;
            stats.count++;
            stats.records.push(record);
            stats.mws.push(record.polymer1MW);
        });

        const candidates: PolymerCandidate[] = Array.from(polymerStats.entries())
            .map(([name, stats]) => ({
                name,
                fullName: getFullPolymerName(name),
                matchCount: stats.count,
                coverageRate: Math.round((stats.count / matchedRecords.length) * 100),
                avgPartitionCoeff: stats.records.reduce((sum, r) => sum + (r.partitionCoefficient || 0), 0) / stats.count,
                mwRange: [Math.min(...stats.mws), Math.max(...stats.mws)] as [number, number],
                compatibleWith: [innerPhase],
                sourceRecordIds: stats.records.map(r => r.id),
            }))
            .sort((a, b) => b.coverageRate - a.coverageRate);

        return {
            records: matchedRecords,
            candidates,
            totalRecords: data.totalRecords || matchedRecords.length,
        };
    },

    /**
     * 获取聚合物的功能标签
     */
    async getPolymerTags(polymerName: string): Promise<DrugDeliveryProfile> {
        await new Promise(resolve => setTimeout(resolve, 500));

        const tags = MOCK_POLYMER_TAGS.filter(
            t => t.polymerName.toLowerCase() === polymerName.toLowerCase()
        );

        const weaknesses: string[] = [];
        const strengths: string[] = [];

        tags.forEach(tag => {
            if (tag.rating === 'poor' || tag.rating === 'none') {
                weaknesses.push(`${getTagDisplayName(tag.tag)}: ${tag.rating}`);
            } else if (tag.rating === 'excellent' || tag.rating === 'good') {
                strengths.push(`${getTagDisplayName(tag.tag)}: ${tag.rating}`);
            }
        });

        // 查找建议的改性方案
        const missingTags = ['Mucoadhesion', 'Site_Specific'].filter(
            t => !tags.find(tag => tag.tag === t && (tag.rating === 'excellent' || tag.rating === 'good'))
        ) as FunctionalTagType[];

        const suggestedModifiers = MOCK_MODIFIERS.filter(mod =>
            mod.compatiblePolymers.includes(polymerName.toUpperCase()) &&
            mod.providedTags.some(t => missingTags.includes(t))
        );

        return {
            polymerId: polymerName.toLowerCase(),
            polymerName,
            tags,
            modifiers: suggestedModifiers,
            overallScore: calculateOverallScore(tags),
            strengths,
            weaknesses,
            suggestedModifications: suggestedModifiers,
        };
    },

    /**
     * 搜索能提供特定功能标签的改性单体
     */
    async searchModifiers(requiredTags: FunctionalTagType[], compatibleWith?: string): Promise<Modifier[]> {
        await new Promise(resolve => setTimeout(resolve, 400));

        return MOCK_MODIFIERS.filter(mod => {
            const hasRequiredTag = requiredTags.some(tag => mod.providedTags.includes(tag));
            const isCompatible = !compatibleWith || mod.compatiblePolymers.includes(compatibleWith.toUpperCase());
            return hasRequiredTag && isCompatible;
        });
    },

    /**
     * 生成最终推荐方案
     */
    async generateRecommendation(
        backbone: string,
        modifiers: string[],
        criteria: FilterCriteria
    ): Promise<Recommendation> {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const formula = [backbone, ...modifiers].join('-');

        return {
            id: `rec-${Date.now()}`,
            polymerFormula: formula,
            components: {
                backbone,
                modifiers,
            },
            satisfiedCriteria: criteria.requiredTags.map(tag => ({
                tag,
                rating: 'excellent' as const,
                explanation: getTagExplanation(tag, backbone, modifiers),
            })),
            mechanismExplanation: generateMechanismExplanation(backbone, modifiers, criteria),
            confidence: 92,
            supportingLiterature: [
                {
                    title: 'Mussel-Inspired Adhesives and Coatings',
                    authors: ['Lee, H.', 'Lee, B. P.', 'Messersmith, P. B.'],
                    journal: 'Annual Review of Materials Research',
                    year: 2011,
                    doi: '10.1146/annurev-matsci-062910-100429',
                    relevanceScore: 98,
                },
                {
                    title: 'pH-Responsive Polymers for Drug Delivery',
                    authors: ['Lowman, A. M.', 'Peppas, N. A.'],
                    journal: 'Advanced Drug Delivery Reviews',
                    year: 1999,
                    doi: '10.1016/S0169-409X(99)00047-9',
                    relevanceScore: 95,
                },
                {
                    title: 'Aqueous Two-Phase Systems for Biotechnology',
                    authors: ['Albertsson, P. A.'],
                    journal: 'Partitioning in Aqueous Two-Phase Systems',
                    year: 1986,
                    doi: '10.1016/B978-0-12-049350-6.X5001-4',
                    relevanceScore: 91,
                },
            ],
            atpsSourceIds: ['atps-001', 'atps-002', 'atps-003'],
        };
    },

    // =============================================
    // Backend API Methods (新增后端接口)
    // =============================================

    /**
     * 获取 BioExtract 数据统计
     */
    async getStats(): Promise<{
        delivery_systems_count: number;
        micro_features_count: number;
        paper_tags_count: number;
        atps_records_count: number;
        last_updated: string | null;
    }> {
        const response = await fetch('/api/v1/bioextract/stats');
        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }
        return response.json();
    },

    /**
     * 查询递送系统数据
     */
    async getDeliverySystems(params?: {
        paper_id?: string;
        carrier_type?: string;
        system_name?: string;
        keyword?: string;
        page?: number;
        page_size?: number;
    }): Promise<{
        items: Record<string, unknown>[];
        total: number;
        page: number;
        page_size: number;
        has_more: boolean;
    }> {
        const searchParams = new URLSearchParams();
        if (params?.paper_id) searchParams.set('paper_id', params.paper_id);
        if (params?.carrier_type) searchParams.set('carrier_type', params.carrier_type);
        if (params?.system_name) searchParams.set('system_name', params.system_name);
        if (params?.keyword) searchParams.set('keyword', params.keyword);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.page_size) searchParams.set('page_size', String(params.page_size));

        const url = `/api/v1/bioextract/delivery-systems?${searchParams.toString()}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch delivery systems');
        }
        return response.json();
    },

    /**
     * 查询微生物特征数据
     */
    async getMicroFeatures(params?: {
        paper_id?: string;
        system_type?: string;
        keyword?: string;
        page?: number;
        page_size?: number;
    }): Promise<{
        items: Record<string, unknown>[];
        total: number;
        page: number;
        page_size: number;
        has_more: boolean;
    }> {
        const searchParams = new URLSearchParams();
        if (params?.paper_id) searchParams.set('paper_id', params.paper_id);
        if (params?.system_type) searchParams.set('system_type', params.system_type);
        if (params?.keyword) searchParams.set('keyword', params.keyword);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.page_size) searchParams.set('page_size', String(params.page_size));

        const url = `/api/v1/bioextract/micro-features?${searchParams.toString()}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch micro features');
        }
        return response.json();
    },

    /**
     * 获取论文 Markdown 内容（已去除 base64 图片）
     */
    async getPaperMarkdown(paperId: string): Promise<{
        paper_id: string;
        markdown_content: string;
        has_images: boolean;
        image_count: number;
        source_url: string | null;
    }> {
        const response = await fetch(`/api/v1/bioextract/papers/${encodeURIComponent(paperId)}/markdown`);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Paper ${paperId} not found`);
            }
            throw new Error('Failed to fetch paper markdown');
        }
        return response.json();
    },

    /**
     * 查询论文标签
     */
    async getPaperTags(params?: {
        paper_id?: string;
        classification?: string;
        l1?: string;
        l2?: string;
        keyword?: string;
        page?: number;
        page_size?: number;
    }): Promise<{
        items: Record<string, unknown>[];
        total: number;
        page: number;
        page_size: number;
        has_more: boolean;
    }> {
        const searchParams = new URLSearchParams();
        if (params?.paper_id) searchParams.set('paper_id', params.paper_id);
        if (params?.classification) searchParams.set('classification', params.classification);
        if (params?.l1) searchParams.set('l1', params.l1);
        if (params?.l2) searchParams.set('l2', params.l2);
        if (params?.keyword) searchParams.set('keyword', params.keyword);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.page_size) searchParams.set('page_size', String(params.page_size));

        const url = `/api/v1/bioextract/paper-tags?${searchParams.toString()}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch paper tags');
        }
        return response.json();
    },

    /**
     * 获取载体类型列表（用于筛选器）
     */
    async getCarrierTypes(): Promise<{
        carrier_types: { carrier_type: string; count: number }[];
    }> {
        const response = await fetch('/api/v1/bioextract/delivery-systems/carrier-types');
        if (!response.ok) {
            throw new Error('Failed to fetch carrier types');
        }
        return response.json();
    },

    /**
     * 获取微生物系统类型列表（用于筛选器）
     */
    async getMicroSystemTypes(): Promise<{
        system_types: { system_type: string; count: number }[];
    }> {
        const response = await fetch('/api/v1/bioextract/micro-features/system-types');
        if (!response.ok) {
            throw new Error('Failed to fetch system types');
        }
        return response.json();
    },

    /**
     * 获取论文分类统计
     */
    async getTagClassifications(): Promise<{
        classifications: { classification: string; count: number }[];
    }> {
        const response = await fetch('/api/v1/bioextract/paper-tags/classifications');
        if (!response.ok) {
            throw new Error('Failed to fetch classifications');
        }
        return response.json();
    },

    // =============================================
    // 知识库集成 - 文献和材料 (从后端数据库读取)
    // =============================================

    /**
     * 搜索文献 (通过后端知识库 API)
     */
    async searchDocuments(params?: {
        query?: string;
        knowledgeBaseId?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        documents: Record<string, unknown>[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    }> {
        // 后端 API 是 POST /api/v1/documents/search
        const url = '/api/v1/documents/search';

        const body = {
            query: params?.query || '',
            knowledgeBaseIds: params?.knowledgeBaseId ? [params.knowledgeBaseId] : undefined,
            page: params?.page || 1,
            pageSize: params?.pageSize || 20,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch documents');
        }
        return response.json();
    },

    /**
     * 获取单个文献详情
     */
    async getDocument(docId: string): Promise<Record<string, unknown>> {
        // 后端 API 是 GET /api/v1/documents/{doc_id}
        const response = await fetch(`/api/v1/documents/${encodeURIComponent(docId)}`);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Document ${docId} not found`);
            }
            throw new Error('Failed to fetch document');
        }
        return response.json();
    },

    /**
     * 搜索材料 (通过后端知识库 API)
     */
    async searchMaterials(params?: {
        query?: string;
        category?: string;
        subcategory?: string;
        functionalRole?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        materials: Record<string, unknown>[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    }> {
        const searchParams = new URLSearchParams();
        if (params?.query) searchParams.set('query', params.query);
        if (params?.category) searchParams.set('category', params.category);
        if (params?.subcategory) searchParams.set('subcategory', params.subcategory);
        if (params?.functionalRole) searchParams.set('functional_role', params.functionalRole);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.pageSize) searchParams.set('page_size', String(params.pageSize));

        // 后端 API 是 GET /api/v1/materials
        const url = `/api/v1/materials?${searchParams.toString()}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch materials');
        }
        return response.json();
    },

    /**
     * 获取单个材料详情
     */
    async getMaterial(materialId: string): Promise<Record<string, unknown>> {
        // 后端 API 是 GET /api/v1/materials/{material_id}
        const response = await fetch(`/api/v1/materials/${encodeURIComponent(materialId)}`);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Material ${materialId} not found`);
            }
            throw new Error('Failed to fetch material');
        }
        return response.json();
    },

    /**
     * 获取知识库统计 (文献 + 材料)
     */
    async getKnowledgeStats(): Promise<{
        totalDocuments: number;
        totalMaterials: number;
        categories: { name: string; count: number }[];
    }> {
        // 后端 API 是 GET /api/v1/stats
        const response = await fetch('/api/v1/stats');
        if (!response.ok) {
            throw new Error('Failed to fetch knowledge stats');
        }
        return response.json();
    },

    // =============================================
    // 对话管理 API
    // =============================================

    /**
     * 创建新对话
     */
    async createConversation(params?: {
        title?: string;
        model?: string;
        expert_id?: string;
        expert_name?: string;
    }): Promise<{
        id: string;
        title: string;
        created_at: string;
        updated_at: string;
    }> {
        const response = await fetch('/api/v1/chat/conversations', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title: params?.title || '新对话',
                model: params?.model,
                expert_id: params?.expert_id,
                expert_name: params?.expert_name,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`创建对话失败: ${error}`);
        }

        return response.json();
    },

    /**
     * 获取对话列表
     */
    async getConversations(params?: {
        limit?: number;
        skip?: number;
        include_archived?: boolean;
    }): Promise<Array<{
        id: string;
        title: string;
        created_at: string;
        updated_at: string;
    }>> {
        const searchParams = new URLSearchParams();
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.skip) searchParams.set('skip', String(params.skip));
        if (params?.include_archived) searchParams.set('include_archived', 'true');

        const url = `/api/v1/chat/conversations?${searchParams.toString()}`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('获取对话列表失败');
        }

        return response.json();
    },

    /**
     * 获取对话历史消息
     */
    async getConversationHistory(conversationId: string): Promise<Array<{
        id: string;
        role: string;
        content: string;
        timestamp: string;
    }>> {
        const response = await fetch(`/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('对话不存在');
            }
            throw new Error('获取对话历史失败');
        }

        return response.json();
    },

    /**
     * 更新对话标题
     */
    async updateConversation(conversationId: string, params: {
        title?: string;
    }): Promise<void> {
        const response = await fetch(`/api/v1/chat/conversations/${encodeURIComponent(conversationId)}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            throw new Error('更新对话失败');
        }
    },

    /**
     * 删除对话
     */
    async deleteConversation(conversationId: string): Promise<void> {
        const response = await fetch(`/api/v1/chat/conversations/${encodeURIComponent(conversationId)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('删除对话失败');
        }
    },
};

// =============================================
// 辅助函数
// =============================================

function getFullPolymerName(abbr: string): string {
    const names: Record<string, string> = {
        'PEG': 'Polyethylene glycol (聚乙二醇)',
        'PVP': 'Polyvinylpyrrolidone (聚乙烯吡咯烷酮)',
        'EOPO': 'Ethylene oxide-propylene oxide (环氧乙烷-环氧丙烷共聚物)',
        'Dextran': 'Dextran (葡聚糖)',
    };
    return names[abbr] || abbr;
}

function getTagDisplayName(tag: FunctionalTagType): string {
    const names: Record<FunctionalTagType, string> = {
        'pH_Stability': '抗胃酸 (pH稳定性)',
        'Enzyme_Resistance': '抗酶性',
        'Mucoadhesion': '粘膜粘附',
        'Site_Specific': '定点释放',
        'Biocompatibility': '生物相容性',
        'Biodegradability': '生物降解性',
        'Controlled_Release': '控释性能',
        'Cell_Penetration': '细胞穿透',
        'Targeting': '靶向性',
    };
    return names[tag] || tag;
}

function calculateOverallScore(tags: PolymerTag[]): number {
    const weights: Record<string, number> = {
        'excellent': 100,
        'good': 75,
        'moderate': 50,
        'poor': 25,
        'none': 0,
    };
    if (tags.length === 0) return 0;
    return Math.round(tags.reduce((sum, t) => sum + (weights[t.rating] || 0), 0) / tags.length);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getTagExplanation(tag: FunctionalTagType, backbone: string, _modifiers: string[]): string {
    const explanations: Record<FunctionalTagType, string> = {
        'pH_Stability': `${backbone} 链段在酸性环境稳定；MAA 在 pH<5 时塌缩形成保护层`,
        'Enzyme_Resistance': `${backbone} 链提供空间位阻，阻挡胃蛋白酶接近`,
        'Mucoadhesion': `DOPA 邻苯二酚基团与肠道黏膜蛋白形成共价交联`,
        'Site_Specific': `MAA 在肠道 pH>7 环境下去质子化，触发溶胀释放`,
        'Biocompatibility': `${backbone} 为 FDA 批准的生物相容性材料`,
        'Biodegradability': '可被生物降解',
        'Controlled_Release': '具有控释能力',
        'Cell_Penetration': '具有细胞穿透能力',
        'Targeting': '具有靶向性',
    };
    return explanations[tag] || '满足要求';
}

function generateMechanismExplanation(backbone: string, modifiers: string[], criteria: FilterCriteria): string {
    return `**推荐配方**: ${backbone}-${modifiers.join('-')}

**作用机制**:
1. **相分离能力**: ${backbone} 链段保证与 ${criteria.innerPhase} 形成稳定的双水相系统 (ATPS)。
2. **抗胃酸/抗酶保护**: MAA 在胃部酸性环境 (pH 1-3) 下质子化收缩，形成致密保护层；${backbone} 链提供空间位阻阻挡蛋白酶。
3. **肠道定殖**: DOPA 邻苯二酚基团通过氢键和共价交联牢固锚定于肠道受损黏膜。
4. **定点释放**: 进入肠道 (pH > 7) 后，MAA 去质子化导致聚合物网络溶胀，释放 ${criteria.innerPhase} 相中的益生菌。`;
}

export default bioextractAPI;
