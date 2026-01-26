/**
 * Literature Mining Module - Type Definitions
 * 文献挖掘模块的类型定义
 */

// ============================================
// Entity Types - 实体类型
// ============================================

/** 实体类型枚举 */
export type EntityType = 'gene' | 'drug' | 'disease' | 'protein' | 'pathway' | 'organism';

/** 实体节点 */
export interface Entity {
    id: string;
    name: string;
    type: EntityType;
    aliases?: string[];
    description?: string;
    /** 出现频次 */
    frequency: number;
    /** 在图谱中的位置 */
    x?: number;
    y?: number;
}

/** 实体关系 */
export interface Relationship {
    id: string;
    sourceId: string;
    targetId: string;
    /** 关系类型：关联、抑制、激活、共表达等 */
    type: 'association' | 'inhibition' | 'activation' | 'co-expression' | 'binding';
    /** 关联强度（共现频率） */
    strength: number;
    /** 支持证据数量 */
    evidenceCount: number;
}

// ============================================
// Publication Types - 论文类型
// ============================================

/** 论文信息 */
export interface Publication {
    id: string;
    pmid?: string;
    doi?: string;
    title: string;
    authors: string[];
    journal: string;
    year: number;
    abstract: string;
    /** 高亮的关键词片段 */
    highlights: HighlightFragment[];
    /** 相关实体 ID */
    relatedEntities: string[];
}

/** 高亮片段 */
export interface HighlightFragment {
    text: string;
    start: number;
    end: number;
    entityId?: string;
    entityType?: EntityType;
}

// ============================================
// Trend Types - 趋势数据类型
// ============================================

/** 年度趋势数据点 */
export interface TrendDataPoint {
    year: number;
    count: number;
    /** 相比上一年的增长率 */
    growthRate?: number;
}

/** 趋势数据集 */
export interface TrendData {
    entityId: string;
    entityName: string;
    data: TrendDataPoint[];
    totalCount: number;
}

// ============================================
// Word Cloud Types - 词云类型
// ============================================

/** 词云单词 */
export interface WordCloudItem {
    text: string;
    value: number;
    entityType?: EntityType;
    entityId?: string;
}

// ============================================
// Graph Types - 图谱类型
// ============================================

/** 图谱节点（用于可视化） */
export interface GraphNode {
    id: string;
    label: string;
    type: EntityType;
    size: number;
    x: number;
    y: number;
    color?: string;
    selected?: boolean;
}

/** 图谱边（用于可视化） */
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    weight: number;
    type: Relationship['type'];
}

/** 图谱数据 */
export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// ============================================
// State Types - 状态类型
// ============================================

/** 文献挖掘模块状态 */
export interface LiteratureState {
    searchQuery: string;
    selectedEntity: Entity | null;
    graphData: GraphData;
    publications: Publication[];
    trendData: TrendData | null;
    wordCloud: WordCloudItem[];
    loading: boolean;
    error: string | null;
}

/** 实体类型颜色映射 */
export const ENTITY_COLORS: Record<EntityType, string> = {
    gene: '#8b5cf6',      // 紫色
    drug: '#f59e0b',      // 橙色
    disease: '#ef4444',   // 红色
    protein: '#06b6d4',   // 青色
    pathway: '#22c55e',   // 绿色
    organism: '#ec4899'   // 粉色
};

/** 实体类型标签 */
export const ENTITY_LABELS: Record<EntityType, string> = {
    gene: '基因',
    drug: '药物',
    disease: '疾病',
    protein: '蛋白质',
    pathway: '代谢通路',
    organism: '生物体'
};
