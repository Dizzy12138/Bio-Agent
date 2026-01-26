/**
 * Microbial Trait Analysis Module - Type Definitions
 * 微生物性状分析模块的类型定义
 */

// ============================================
// Microbe Types - 微生物类型
// ============================================

/** 革兰氏染色类型 */
export type GramType = 'positive' | 'negative' | 'variable';

/** 代谢类型 */
export type MetabolismType = 'aerobic' | 'anaerobic' | 'facultative' | 'microaerophilic';

/** 微生物基本信息 */
export interface Microbe {
    id: string;
    name: string;
    scientificName: string;
    taxonomy: {
        kingdom: string;
        phylum: string;
        class: string;
        order: string;
        family: string;
        genus: string;
        species: string;
    };
    description?: string;
    imageUrl?: string;
}

// ============================================
// Trait Types - 性状类型
// ============================================

/** 性状类别 */
export type TraitCategory =
    | 'morphology'      // 形态
    | 'physiology'      // 生理
    | 'metabolism'      // 代谢
    | 'resistance'      // 抗性
    | 'pathogenicity';  // 致病性

/** 单个性状 */
export interface Trait {
    id: string;
    name: string;
    category: TraitCategory;
    value: string | number | boolean;
    unit?: string;
    icon?: string;
    description?: string;
    confidence?: number;
}

/** 性状组 */
export interface TraitGroup {
    category: TraitCategory;
    label: string;
    icon: string;
    traits: Trait[];
}

/** 抗生素抗性 */
export interface AntibioticResistance {
    antibiotic: string;
    category: string;
    resistant: boolean;
    mic?: number; // 最小抑菌浓度
    gene?: string; // 相关抗性基因
}

// ============================================
// Pathway Types - 代谢通路类型
// ============================================

/** 通路节点类型 */
export type PathwayNodeType = 'enzyme' | 'metabolite' | 'gene' | 'reaction';

/** 通路节点 */
export interface PathwayNode {
    id: string;
    label: string;
    type: PathwayNodeType;
    x: number;
    y: number;
    /** 该微生物是否具备此节点 */
    present: boolean;
    /** EC 编号或 KEGG ID */
    externalId?: string;
}

/** 通路边 */
export interface PathwayEdge {
    id: string;
    source: string;
    target: string;
    /** 反应类型 */
    reactionType?: string;
}

/** 代谢通路 */
export interface Pathway {
    id: string;
    name: string;
    description?: string;
    nodes: PathwayNode[];
    edges: PathwayEdge[];
    /** 完整度百分比 */
    completeness: number;
}

// ============================================
// Phylogenetic Types - 系统发育类型
// ============================================

/** 进化树节点 */
export interface PhylogeneticNode {
    id: string;
    name: string;
    scientificName?: string;
    /** 分支长度 */
    branchLength: number;
    /** 子节点 */
    children?: PhylogeneticNode[];
    /** 是否高亮（当前微生物） */
    highlighted?: boolean;
    /** 性状对比数据 */
    traits?: Record<string, string | number | boolean>;
}

// ============================================
// Abundance Types - 丰度类型
// ============================================

/** 丰度数据点 */
export interface AbundanceDataPoint {
    sampleId: string;
    sampleName: string;
    abundance: number;
    /** 百分比 */
    percentage: number;
    /** 分组标签 */
    group?: string;
}

/** 群落丰度数据 */
export interface AbundanceData {
    microbeId: string;
    microbeName: string;
    samples: AbundanceDataPoint[];
    averageAbundance: number;
}

// ============================================
// State Types - 状态类型
// ============================================

/** 微生物性状分析模块状态 */
export interface MicrobialState {
    selectedMicrobe: Microbe | null;
    traits: TraitGroup[];
    resistances: AntibioticResistance[];
    pathways: Pathway[];
    selectedPathway: Pathway | null;
    phylogeneticTree: PhylogeneticNode | null;
    abundanceData: AbundanceData | null;
    loading: boolean;
    error: string | null;
}

// ============================================
// Constants - 常量
// ============================================

/** 性状类别配置 */
export const TRAIT_CATEGORIES: Record<TraitCategory, { label: string; icon: string; color: string }> = {
    morphology: { label: '形态特征', icon: '🔬', color: '#8b5cf6' },
    physiology: { label: '生理特性', icon: '🌡️', color: '#06b6d4' },
    metabolism: { label: '代谢特征', icon: '⚗️', color: '#22c55e' },
    resistance: { label: '抗性特征', icon: '🛡️', color: '#f59e0b' },
    pathogenicity: { label: '致病性', icon: '⚠️', color: '#ef4444' },
};

/** 通路节点类型颜色 */
export const PATHWAY_NODE_COLORS: Record<PathwayNodeType, string> = {
    enzyme: '#8b5cf6',
    metabolite: '#22c55e',
    gene: '#3b82f6',
    reaction: '#f59e0b',
};
