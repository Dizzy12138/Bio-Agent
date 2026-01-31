from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime

# =============================================
# 既有模型 (保持不变)
# =============================================

class ATPSRecord(BaseModel):
    id: str
    polymer1: str
    polymer2: str
    polymer1MW: int
    polymer2MW: int
    polymer1Conc: float
    polymer2Conc: float
    temperature: float
    pH: float
    phaseFormation: bool
    topPhase: str
    bottomPhase: str
    partitionCoefficient: float
    reference: str
    doi: Optional[str] = None

class PolymerTag(BaseModel):
    polymerId: str
    polymerName: str
    tag: str
    rating: Literal['excellent', 'good', 'moderate', 'poor', 'none']
    conditions: Optional[str] = None
    mechanism: Optional[str] = None

class PolymerCandidate(BaseModel):
    name: str
    fullName: str
    matchCount: int
    coverageRate: int
    avgPartitionCoeff: float
    mwRange: List[float]
    compatibleWith: List[str]
    sourceRecordIds: List[str]

class FilterCriteria(BaseModel):
    innerPhase: str
    requiredTags: List[str]


# =============================================
# 新增模型 - 递送载体系统 (DeliveryQwen)
# =============================================

class DeliveryQwen(BaseModel):
    """递送载体系统数据模型 (对应 delivery-qwen.csv，约82列)"""
    
    # 基础信息
    paper_id: str
    system_index: int = 0
    system_name: Optional[str] = None
    carrier_type: Optional[str] = None
    carrier_response: Optional[str] = None
    carrier_components: Optional[str] = None
    payload_items: Optional[str] = None
    
    # B_* 生物相容性
    B1_tissue_tolerance: Optional[str] = None
    B1_tissue_tolerance_material: Optional[str] = None
    B2_cytocompatibility: Optional[str] = None
    B2_cytocompatibility_material: Optional[str] = None
    B3_interfacial_behavior: Optional[str] = None
    B3_interfacial_behavior_material: Optional[str] = None
    B4_immunomodulation: Optional[str] = None
    B4_immunomodulation_material: Optional[str] = None
    B5_hemocompatibility: Optional[str] = None
    B5_hemocompatibility_material: Optional[str] = None
    B6_residence_clearance: Optional[str] = None
    B6_residence_clearance_material: Optional[str] = None
    
    # F_* 功能特性
    F1_localization_retention: Optional[str] = None
    F1_localization_retention_material: Optional[str] = None
    F2_release_kinetics: Optional[str] = None
    F2_release_kinetics_material: Optional[str] = None
    F3_selective_permeability: Optional[str] = None
    F3_selective_permeability_material: Optional[str] = None
    F4_stimulus_response: Optional[str] = None
    F4_stimulus_response_material: Optional[str] = None
    F5_antifouling: Optional[str] = None
    F5_antifouling_material: Optional[str] = None
    F6_therapeutic_compatibility: Optional[str] = None
    F6_therapeutic_compatibility_material: Optional[str] = None
    F7_failure_management: Optional[str] = None
    F7_failure_management_material: Optional[str] = None
    
    # I_* 固有属性
    I1_chemical_composition: Optional[str] = None
    I2_gelation_modality: Optional[str] = None
    I2_gelation_modality_material: Optional[str] = None
    
    # C_* 微生物相容性
    C1_viability_support: Optional[str] = None
    C1_viability_support_material: Optional[str] = None
    C2_microbial_compatibility: Optional[str] = None
    C2_microbial_compatibility_material: Optional[str] = None
    C3_protection_efficacy: Optional[str] = None
    C3_protection_efficacy_material: Optional[str] = None
    
    # P_* 加工特性
    P1_gelation_pathway: Optional[str] = None
    P1_gelation_pathway_material: Optional[str] = None
    P2_rheology: Optional[str] = None
    P2_rheology_material: Optional[str] = None
    P3_processing_window: Optional[str] = None
    P4_mechanical_stability: Optional[str] = None
    P4_mechanical_stability_material: Optional[str] = None
    P5_process_route: Optional[str] = None
    P6_structural_construction: Optional[str] = None
    
    # K_* 负载指标
    K_loading_efficiency: Optional[str] = None
    K_encapsulation_method: Optional[str] = None
    
    # M_* 材料界面
    M1_moisture_balance: Optional[str] = None
    M1_evidence: Optional[str] = None
    M1_related_material: Optional[str] = None
    M2_conformability: Optional[str] = None
    M2_evidence: Optional[str] = None
    M2_related_material: Optional[str] = None
    M3_structural_stability: Optional[str] = None
    M3_evidence: Optional[str] = None
    M3_related_material: Optional[str] = None
    M4_mass_transfer: Optional[str] = None
    M4_evidence: Optional[str] = None
    M4_related_material: Optional[str] = None
    
    # R_* 修复增益
    R1_inflammation_buffer: Optional[str] = None
    R1_evidence: Optional[str] = None
    R1_related_material: Optional[str] = None
    R2_repair_signal_amplification: Optional[str] = None
    R2_evidence: Optional[str] = None
    R2_related_material: Optional[str] = None
    R3_microenvironment_tuning: Optional[str] = None
    R3_evidence: Optional[str] = None
    R3_related_material: Optional[str] = None
    R4_microbe_compatible: Optional[str] = None
    R4_evidence: Optional[str] = None
    R4_related_material: Optional[str] = None
    
    class Config:
        extra = "allow"  # Allow extra fields from CSV


# =============================================
# 新增模型 - 微生物特征 (MicroFeat)
# =============================================

class MicroFeat(BaseModel):
    """微生物特征数据模型 (对应 micro_feat.csv，约72列)"""
    
    # 基础信息
    paper_id: str
    system_index: int = 0
    system_type: Optional[str] = None
    composition: Optional[str] = None
    spatial_arrangement: Optional[str] = None
    
    # C_* 生长特性
    C_oxygen_tolerance: Optional[str] = None
    C_growth_conditions: Optional[str] = None
    C_growth_kinetics: Optional[str] = None
    C_colonization_niche: Optional[str] = None
    C_microbiome_interaction: Optional[str] = None
    C_stress_tolerance: Optional[str] = None
    C_stress_tolerance_material: Optional[str] = None
    C_growth_desc: Optional[str] = None
    
    # G_* 遗传工程
    G_genetic_tools: Optional[str] = None
    G_edit_efficiency: Optional[str] = None
    G_circuit_control: Optional[str] = None
    G_circuit_inducer_material: Optional[str] = None
    G_genetic_stability: Optional[str] = None
    G_material_coupling: Optional[str] = None
    G_engineering_desc: Optional[str] = None
    
    # S_* 信号感知
    S_physiochemical_signals: Optional[str] = None
    S_metabolite_signals: Optional[str] = None
    S_microbial_signals: Optional[str] = None
    S_host_signals: Optional[str] = None
    S_sensing_component_material: Optional[str] = None
    S_logic_gate_desc: Optional[str] = None
    S_logic_desc: Optional[str] = None
    
    # E_* 效应功能
    E_primary_functions: Optional[str] = None
    E_secretion_mech: Optional[str] = None
    E_dosage_control: Optional[str] = None
    E_material_match: Optional[str] = None
    
    # E_A_* 抗菌功能
    E_A_has_antibacterial: Optional[str] = None
    E_A_broad_spectrum: Optional[str] = None
    E_A_biofilm_inhib: Optional[str] = None
    E_A_mechanism_desc: Optional[str] = None
    E_A_agent_material: Optional[str] = None
    
    # E_B_* 产氧功能
    E_B_has_oxygenation: Optional[str] = None
    E_B_mechanism_desc: Optional[str] = None
    E_B_oxygen_material: Optional[str] = None
    
    # E_C_* 免疫调节
    E_C_has_immunomodulation: Optional[str] = None
    E_C_mechanism_desc: Optional[str] = None
    E_C_modulator_material: Optional[str] = None
    
    # E_D_* 组织修复
    E_D_has_repair: Optional[str] = None
    E_D_mechanism_desc: Optional[str] = None
    E_D_repair_material: Optional[str] = None
    
    # E_E_* 代谢调节
    E_E_has_metabolic: Optional[str] = None
    E_E_mechanism_desc: Optional[str] = None
    E_E_metabolite_material: Optional[str] = None
    
    # E_F_* 肿瘤治疗
    E_F_has_tumor: Optional[str] = None
    E_F_mechanism_desc: Optional[str] = None
    E_F_agent_material: Optional[str] = None
    
    # B_* 生物安全
    B_bsl_level: Optional[str] = None
    B_biocontainment_strategy: Optional[str] = None
    B_containment_material: Optional[str] = None
    B_risk_assessment: Optional[str] = None
    B_material_barrier: Optional[str] = None
    B_risk_desc: Optional[str] = None
    
    # 效果描述
    healing_efficacy_desc: Optional[str] = None
    
    class Config:
        extra = "allow"


# =============================================
# 新增模型 - 论文标签 (PaperTag)
# =============================================

class PaperTagRecord(BaseModel):
    """论文标签数据模型 (对应 tag.csv)"""
    paper_id: str
    title: Optional[str] = None
    abstract: Optional[str] = None
    classification: Optional[str] = None
    l1: Optional[str] = None  # 一级分类
    l2: Optional[str] = None  # 二级分类
    l3: Optional[str] = None  # 三级分类
    reasoning: Optional[str] = None  # 分类理由


# =============================================
# 新增模型 - 外部 Paper API 响应
# =============================================

class PaperMarkdownResponse(BaseModel):
    """外部论文服务 Markdown 响应"""
    paper_id: str
    markdown_content: str  # 已去除 base64 图片的 Markdown
    has_images: bool = False  # 原始内容是否包含 base64 图片
    image_count: int = 0  # 原始图片数量
    source_url: Optional[str] = None


class PaperPDFResponse(BaseModel):
    """外部论文服务 PDF 响应"""
    paper_id: str
    pdf_url: str
    file_size: Optional[int] = None


# =============================================
# 查询参数模型
# =============================================

class DeliveryQueryParams(BaseModel):
    """递送系统查询参数"""
    paper_id: Optional[str] = None
    carrier_type: Optional[str] = None
    system_name: Optional[str] = None
    keyword: Optional[str] = None  # 全文搜索关键词
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class MicroFeatQueryParams(BaseModel):
    """微生物特征查询参数"""
    paper_id: Optional[str] = None
    system_type: Optional[str] = None
    keyword: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaperTagQueryParams(BaseModel):
    """论文标签查询参数"""
    paper_id: Optional[str] = None
    classification: Optional[str] = None
    l1: Optional[str] = None
    l2: Optional[str] = None
    keyword: Optional[str] = None  # 标题/摘要搜索
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


# =============================================
# 分页响应模型
# =============================================

class PaginatedResponse(BaseModel):
    """通用分页响应"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    has_more: bool


class BioExtractStats(BaseModel):
    """BioExtract 数据统计"""
    delivery_systems_count: int = 0
    micro_features_count: int = 0
    paper_tags_count: int = 0
    atps_records_count: int = 0
    last_updated: Optional[datetime] = None
