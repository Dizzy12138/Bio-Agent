// =============================================
// Knowledge Management - Type Definitions
// =============================================

// 分类树节点
export interface CategoryNode {
    id: string;
    name: string;
    icon?: string;
    children?: CategoryNode[];
    count?: number;
    type: 'folder' | 'category' | 'tag';
    metadata?: Record<string, unknown>;
}

// Re-export Document types from API
export type { Document, DocumentFeature } from './api/knowledgeAPI';

// Re-export Material types from API
export type { Material, MaterialProperty } from './api/knowledgeAPI';

// Re-export PromptTemplate types from API
export type { PromptTemplate, PromptVariable } from './api/knowledgeAPI';

// 知识库视图类型
export type KnowledgeViewType = 'documents' | 'materials' | 'templates' | 'graph';

// 知识库状态
export interface KnowledgeState {
    activeView: KnowledgeViewType;
    selectedCategory: string | null;
    selectedItem: string | null;
    searchQuery: string;
    filters: Record<string, unknown>;
    isLoading: boolean;
    error: string | null;
}

// API响应包装
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    total?: number;
    page?: number;
    pageSize?: number;
    error?: string;
}

// 同步状态
export interface SyncStatus {
    lastSyncAt: string | null;
    isSyncing: boolean;
    syncProgress: number;
    syncError: string | null;
    pendingCount: number;
}
