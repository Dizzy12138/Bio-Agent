/**
 * BioExtract-AI 类型定义
 * 用于 ATPS 双水相系统 + Drug Delivery 标签库的智能筛选
 */

// =============================================
// ATPS 数据库相关类型
// =============================================

// ATPS 记录 - 双水相系统数据
export interface ATPSRecord {
    id: string;
    polymer1: string;           // 聚合物1 (如 PEG)
    polymer2: string;           // 聚合物2 (如 Dextran)
    polymer1MW: number;         // 聚合物1分子量
    polymer2MW: number;         // 聚合物2分子量
    polymer1Conc: number;       // 聚合物1浓度 (% w/w)
    polymer2Conc: number;       // 聚合物2浓度 (% w/w)
    temperature: number;        // 实验温度 (°C)
    pH: number;                 // pH 值
    phaseFormation: boolean;    // 是否成相
    topPhase: string;           // 上相聚合物
    bottomPhase: string;        // 下相聚合物
    partitionCoefficient?: number; // 分配系数
    reference: string;          // 文献来源
    doi?: string;               // DOI
    notes?: string;             // 备注
}

// 聚合物筛选结果
export interface PolymerCandidate {
    name: string;               // 聚合物名称
    fullName: string;           // 全名
    matchCount: number;         // 匹配记录数
    coverageRate: number;       // 覆盖率 (%)
    avgPartitionCoeff?: number; // 平均分配系数
    mwRange: [number, number];  // 分子量范围
    compatibleWith: string[];   // 兼容的聚合物列表
    sourceRecordIds: string[];  // 来源记录ID
}

// =============================================
// Drug Delivery 标签库相关类型
// =============================================

// 功能标签类型
export type FunctionalTagType =
    | 'pH_Stability'        // pH 稳定性
    | 'Enzyme_Resistance'   // 抗酶性
    | 'Mucoadhesion'        // 粘膜粘附
    | 'Site_Specific'       // 定点释放
    | 'Biocompatibility'    // 生物相容性
    | 'Biodegradability'    // 生物降解性
    | 'Controlled_Release'  // 控释性能
    | 'Cell_Penetration'    // 细胞穿透
    | 'Targeting';          // 靶向性

// 标签评级
export type TagRating = 'excellent' | 'good' | 'moderate' | 'poor' | 'none';

// 聚合物功能标签
export interface PolymerTag {
    polymerId: string;
    polymerName: string;
    tag: FunctionalTagType;
    rating: TagRating;
    conditions?: string;        // 条件说明 (如 "pH 1-3")
    mechanism?: string;         // 作用机制
    reference?: string;         // 文献来源
}

// 改性单体
export interface Modifier {
    id: string;
    name: string;               // 名称 (如 MAA, DOPA)
    fullName: string;           // 全名
    category: 'monomer' | 'crosslinker' | 'functional_group' | 'initiator';
    providedTags: FunctionalTagType[];  // 提供的功能标签
    compatiblePolymers: string[];       // 兼容的聚合物
    mechanism: string;          // 作用机制
    chemicalStructure?: string; // 化学结构式
    references: string[];       // 参考文献
}

// 药物递送系统属性
export interface DrugDeliveryProfile {
    polymerId: string;
    polymerName: string;
    tags: PolymerTag[];
    modifiers: Modifier[];
    overallScore: number;       // 综合评分 (0-100)
    strengths: string[];        // 优势
    weaknesses: string[];       // 劣势
    suggestedModifications: Modifier[];  // 建议的改性方案
}

// =============================================
// Agent 交互相关类型
// =============================================

// 筛选条件
export interface FilterCriteria {
    innerPhase: string;                 // 内相聚合物 (如 Dextran)
    requiredTags: FunctionalTagType[];  // 必需的功能标签
    optionalTags?: FunctionalTagType[]; // 可选的功能标签
    targetApplication?: string;         // 目标应用场景
    constraints?: {
        pHRange?: [number, number];     // pH 范围
        temperatureRange?: [number, number];
        mwRange?: [number, number];
    };
}

// 筛选步骤
export interface FilterStep {
    id: string;
    stepNumber: number;
    type: 'atps_filter' | 'tag_check' | 'modifier_search' | 'synthesis' | 'literature_search';
    status: 'pending' | 'running' | 'completed' | 'warning' | 'error';
    description: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    executionLog: string[];     // 执行日志
    timestamp: Date;
    duration?: number;          // 执行时间 (ms)
}

import type { ThinkingStep } from '../agent';

// Agent 消息
export interface AgentMessage {
    id: string;
    role: 'user' | 'agent' | 'system';
    content: string;
    timestamp: Date;
    thinkingSteps?: ThinkingStep[];  // 本轮思考过程（每条消息独立）
    metadata?: {
        stepId?: string;
        filterResults?: PolymerCandidate[];
        recommendations?: Recommendation[];
        processLog?: string[];
    };
}

// 推荐结果
export interface Recommendation {
    id: string;
    polymerFormula: string;     // 聚合物配方 (如 PEG-MAA-DOPA)
    components: {
        backbone: string;       // 骨架聚合物
        modifiers: string[];    // 改性单体
    };
    satisfiedCriteria: {
        tag: FunctionalTagType;
        rating: TagRating;
        explanation: string;
    }[];
    mechanismExplanation: string;   // 机制解释
    confidence: number;             // 置信度 (0-100)
    supportingLiterature: {
        title: string;
        authors: string[];
        journal: string;
        year: number;
        doi: string;
        relevanceScore: number;
    }[];
    atpsSourceIds: string[];        // ATPS 数据来源
}

// Agent 会话状态
export interface AgentSession {
    id: string;
    startTime: Date;
    status: 'idle' | 'processing' | 'awaiting_input' | 'completed';
    criteria?: FilterCriteria;
    steps: FilterStep[];
    messages: AgentMessage[];
    currentRecommendations: Recommendation[];
    selectedRecommendation?: Recommendation;
}

// 处理日志条目
export interface ProcessLogEntry {
    timestamp: Date;
    type: 'command' | 'query' | 'result' | 'warning' | 'info';
    content: string;
    details?: Record<string, unknown>;
}
