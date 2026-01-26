/**
 * Molecular Property Analysis Module - Type Definitions
 * 分子性质分析模块的类型定义
 */

// ============================================
// Molecule Types - 分子类型
// ============================================

/** 分子基本信息 */
export interface Molecule {
    id: string;
    name: string;
    smiles: string;
    formula: string;
    /** 2D 结构图 URL */
    structure2D?: string;
    /** 3D 结构数据（PDB/SDF 格式） */
    structure3D?: string;
    /** 分子描述 */
    description?: string;
}

// ============================================
// Lipinski Rule Types - 里宾斯基规则类型
// ============================================

/** 里宾斯基五规则数据 */
export interface LipinskiRule {
    /** 分子量 (≤500 Da) */
    molecularWeight: number;
    /** LogP (≤5) */
    logP: number;
    /** 氢键供体数量 (≤5) */
    hBondDonors: number;
    /** 氢键受体数量 (≤10) */
    hBondAcceptors: number;
    /** 可旋转键数量 */
    rotatableBonds: number;
    /** 极性表面积 (≤140 Å²) */
    tpsa: number;
}

/** 规则阈值配置 */
export interface LipinskiThresholds {
    molecularWeight: number;
    logP: number;
    hBondDonors: number;
    hBondAcceptors: number;
    rotatableBonds: number;
    tpsa: number;
}

/** 默认里宾斯基阈值 */
export const DEFAULT_LIPINSKI_THRESHOLDS: LipinskiThresholds = {
    molecularWeight: 500,
    logP: 5,
    hBondDonors: 5,
    hBondAcceptors: 10,
    rotatableBonds: 10,
    tpsa: 140
};

// ============================================
// ADMET Types - ADMET 类型
// ============================================

/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high';

/** ADMET 属性项 */
export interface ADMETProperty {
    name: string;
    value: number | string;
    unit?: string;
    risk: RiskLevel;
    description?: string;
}

/** ADMET 属性分类 */
export interface ADMETCategory {
    id: 'absorption' | 'distribution' | 'metabolism' | 'excretion' | 'toxicity';
    label: string;
    icon: string;
    properties: ADMETProperty[];
}

/** ADMET 预测结果 */
export interface ADMETProperties {
    absorption: ADMETProperty[];
    distribution: ADMETProperty[];
    metabolism: ADMETProperty[];
    excretion: ADMETProperty[];
    toxicity: ADMETProperty[];
    overallScore: number;
    druglikeness: 'Excellent' | 'Good' | 'Moderate' | 'Poor';
}

// ============================================
// Property Prediction Types - 属性预测类型
// ============================================

/** 属性预测结果 */
export interface PropertyPrediction {
    molecule: Molecule;
    lipinski: LipinskiRule;
    admet: ADMETProperties;
    /** 预测置信度 */
    confidence: number;
    /** 预测时间 */
    timestamp: Date;
}

// ============================================
// Editor Types - 编辑器类型
// ============================================

/** 结构编辑历史 */
export interface EditHistory {
    smiles: string;
    timestamp: Date;
}

/** 编辑器状态 */
export interface EditorState {
    currentSmiles: string;
    history: EditHistory[];
    historyIndex: number;
    isValid: boolean;
    errorMessage?: string;
}

// ============================================
// View Types - 视图类型
// ============================================

/** 分子查看器模式 */
export type ViewerMode = '2D' | '3D';

/** 3D 渲染样式 */
export type RenderStyle = 'stick' | 'ball-and-stick' | 'sphere' | 'surface';

/** 表面类型 */
export type SurfaceType = 'none' | 'vdw' | 'sas' | 'ses' | 'electrostatic';

/** 查看器配置 */
export interface ViewerConfig {
    mode: ViewerMode;
    renderStyle: RenderStyle;
    surfaceType: SurfaceType;
    showHydrogens: boolean;
    showLabels: boolean;
    backgroundColor: string;
}

// ============================================
// Helper Functions - 辅助函数
// ============================================

/** 获取风险等级颜色 */
export const getRiskColor = (risk: RiskLevel): string => {
    switch (risk) {
        case 'low': return '#22c55e';
        case 'medium': return '#f59e0b';
        case 'high': return '#ef4444';
    }
};

/** 计算里宾斯基违规数量 */
export const countLipinskiViolations = (
    lipinski: LipinskiRule,
    thresholds: LipinskiThresholds = DEFAULT_LIPINSKI_THRESHOLDS
): number => {
    let violations = 0;
    if (lipinski.molecularWeight > thresholds.molecularWeight) violations++;
    if (lipinski.logP > thresholds.logP) violations++;
    if (lipinski.hBondDonors > thresholds.hBondDonors) violations++;
    if (lipinski.hBondAcceptors > thresholds.hBondAcceptors) violations++;
    return violations;
};

/** 判断成药性 */
export const getDruglikeness = (violations: number): string => {
    if (violations === 0) return '优秀';
    if (violations === 1) return '良好';
    if (violations === 2) return '一般';
    return '较差';
};
