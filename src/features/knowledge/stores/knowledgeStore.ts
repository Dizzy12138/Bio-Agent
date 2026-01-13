import { create } from 'zustand';
import type { KnowledgeBase, Document, SearchParams, KnowledgeAPIConfig, Material, PromptTemplate } from '../api/knowledgeAPI';
import { mockKnowledgeAPI, MOCK_KNOWLEDGE_BASES, knowledgeAPI } from '../api/knowledgeAPI';

interface KnowledgeState {
    // 知识库列表
    knowledgeBases: KnowledgeBase[];
    selectedKnowledgeBase: KnowledgeBase | null;
    isLoadingBases: boolean;

    // 文档/搜索
    searchQuery: string;
    searchResults: Document[];
    isSearching: boolean;
    searchTotal: number;
    searchPage: number;

    // 文档详情
    selectedDocument: Document | null;
    isLoadingDocument: boolean;

    // 材料数据
    materials: Material[];
    isLoadingMaterials: boolean;
    selectedMaterial: Material | null;

    // 模板数据
    templates: PromptTemplate[];
    isLoadingTemplates: boolean;
    selectedTemplate: PromptTemplate | null;

    // API 连接状态
    isConnected: boolean;
    lastError: string | null;

    // Actions
    loadKnowledgeBases: () => Promise<void>;
    selectKnowledgeBase: (kb: KnowledgeBase | null) => void;
    searchDocuments: (params: SearchParams) => Promise<void>;
    loadMoreResults: () => Promise<void>;
    selectDocument: (doc: Document | null) => void;
    loadDocument: (id: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
    clearSearch: () => void;
    checkConnection: () => Promise<boolean>;
    setAPIConfig: (config: Partial<KnowledgeAPIConfig>) => void;

    // 材料操作
    loadMaterials: (params: { query: string; categoryId?: string }) => Promise<void>;
    selectMaterial: (mat: Material | null) => void;

    // 模板操作
    loadTemplates: (params: { query: string; categoryId?: string }) => Promise<void>;
    selectTemplate: (tpl: PromptTemplate | null) => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
    // Initial state
    knowledgeBases: [],
    selectedKnowledgeBase: null,
    isLoadingBases: false,

    searchQuery: '',
    searchResults: [],
    isSearching: false,
    searchTotal: 0,
    searchPage: 1,

    selectedDocument: null,
    isLoadingDocument: false,

    materials: [],
    isLoadingMaterials: false,
    selectedMaterial: null,

    templates: [],
    isLoadingTemplates: false,
    selectedTemplate: null,

    isConnected: false,
    lastError: null,

    // Actions
    loadKnowledgeBases: async () => {
        set({ isLoadingBases: true, lastError: null });
        try {
            // 使用 Mock API (后续替换为真实 API)
            const response = await mockKnowledgeAPI.getKnowledgeBases();
            if (response.success && response.data) {
                set({
                    knowledgeBases: response.data,
                    isLoadingBases: false,
                    isConnected: true,
                });
            } else {
                // 降级使用本地 Mock 数据
                set({
                    knowledgeBases: MOCK_KNOWLEDGE_BASES,
                    isLoadingBases: false,
                    isConnected: false,
                    lastError: response.error || '加载失败',
                });
            }
        } catch (error) {
            set({
                knowledgeBases: MOCK_KNOWLEDGE_BASES,
                isLoadingBases: false,
                isConnected: false,
                lastError: error instanceof Error ? error.message : '未知错误',
            });
        }
    },

    selectKnowledgeBase: (kb) => {
        set({ selectedKnowledgeBase: kb });
    },

    searchDocuments: async (params) => {
        set({ isSearching: true, searchQuery: params.query, searchPage: 1 });
        try {
            const response = await mockKnowledgeAPI.searchDocuments(params);
            if (response.success && response.data) {
                set({
                    searchResults: response.data.documents,
                    searchTotal: response.data.total,
                    isSearching: false,
                });
            } else {
                set({
                    searchResults: [],
                    searchTotal: 0,
                    isSearching: false,
                    lastError: response.error,
                });
            }
        } catch (error) {
            set({
                searchResults: [],
                isSearching: false,
                lastError: error instanceof Error ? error.message : '搜索失败',
            });
        }
    },

    loadMoreResults: async () => {
        const { searchQuery, searchPage, searchResults } = get();
        set({ isSearching: true });
        try {
            const response = await mockKnowledgeAPI.searchDocuments({
                query: searchQuery,
                page: searchPage + 1,
            });
            if (response.success && response.data) {
                set({
                    searchResults: [...searchResults, ...response.data.documents],
                    searchPage: searchPage + 1,
                    isSearching: false,
                });
            }
        } catch {
            set({ isSearching: false });
        }
    },

    selectDocument: (doc) => {
        set({ selectedDocument: doc });
    },

    loadDocument: async (id) => {
        set({ isLoadingDocument: true });
        try {
            const response = await mockKnowledgeAPI.getDocument(id);
            if (response.success && response.data) {
                set({
                    selectedDocument: response.data,
                    isLoadingDocument: false,
                });
            }
        } catch {
            set({ isLoadingDocument: false });
        }
    },

    setSearchQuery: (query) => {
        set({ searchQuery: query });
    },

    clearSearch: () => {
        set({
            searchQuery: '',
            searchResults: [],
            searchTotal: 0,
            searchPage: 1,
        });
    },

    setAPIConfig: (config: Partial<KnowledgeAPIConfig>) => {
        knowledgeAPI.setConfig(config);
        // 如果配置了 baseUrl，尝试连接检查
        if (config.baseUrl) {
            get().checkConnection();
        } else {
            set({ isConnected: false });
        }
    },

    checkConnection: async () => {
        const isConnected = await knowledgeAPI.checkConnection();
        set({ isConnected, lastError: isConnected ? null : '无法连接到 API' });
        return isConnected;
    },

    // 材料操作
    loadMaterials: async (params) => {
        set({ isLoadingMaterials: true, lastError: null });
        try {
            const response = await mockKnowledgeAPI.getMaterials(params);
            if (response.success && response.data) {
                set({
                    materials: response.data,
                    isLoadingMaterials: false,
                });
            } else {
                set({
                    materials: [],
                    isLoadingMaterials: false,
                    lastError: response.error || '加载材料失败',
                });
            }
        } catch (error) {
            set({
                materials: [],
                isLoadingMaterials: false,
                lastError: error instanceof Error ? error.message : '加载材料失败',
            });
        }
    },

    selectMaterial: (mat) => {
        set({ selectedMaterial: mat });
    },

    // 模板操作
    loadTemplates: async (params) => {
        set({ isLoadingTemplates: true, lastError: null });
        try {
            const response = await mockKnowledgeAPI.getTemplates(params);
            if (response.success && response.data) {
                set({
                    templates: response.data,
                    isLoadingTemplates: false,
                });
            } else {
                set({
                    templates: [],
                    isLoadingTemplates: false,
                    lastError: response.error || '加载模板失败',
                });
            }
        } catch (error) {
            set({
                templates: [],
                isLoadingTemplates: false,
                lastError: error instanceof Error ? error.message : '加载模板失败',
            });
        }
    },

    selectTemplate: (tpl) => {
        set({ selectedTemplate: tpl });
    },
}));
