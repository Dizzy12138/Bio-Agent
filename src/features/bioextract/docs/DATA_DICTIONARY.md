# BioExtract-AI 数据字典

> 最后更新：2026-01-13

本文档详细描述了 BioExtract-AI 系统中所有数据表的结构、字段含义和使用说明。

---

## 📊 数据库概览

| 表名 | 数据源 | 记录数 | 说明 |
|------|--------|--------|------|
| `delivery_qwen` | delivery-qwen.csv | ~258 | 递送载体特征 |
| `micro_feat` | micro_feat.csv | ~948 | 微生物工程特征 |
| `paper_tags` | tag.csv | ~43,245 | 论文分类标签 |
| `polymer_classification` | experiment_data_split.xlsx | ~2,674 | 高分子分类 |
| `experiment_conditions` | experiment_data_split.xlsx | - | ATPS 实验条件 |
| `experiment_results` | experiment_data_split.xlsx | - | ATPS 实验结果 |
| `extraction_summary` | extraction_summary_cleaned.xlsx | - | 提取摘要 |
| `atps_papers` | ATPS应用.xlsx | - | PEGMA 相关论文 |

---

## 1️⃣ `delivery_qwen` - 递送载体表

### 概述
存储生物材料递送载体的详细特征信息，包括生物相容性、功能特性、加工特性等。

### 字段分类

#### A. 基础信息 (1-7)

| 字段 | 类型 | 说明 |
|------|------|------|
| `paper_id` | TEXT | 论文唯一标识符 |
| `system_index` | INTEGER | 系统序号 |
| `system_name` | TEXT | 系统名称 |
| `carrier_type` | TEXT | 载体类型 |
| `carrier_response` | TEXT | 响应因子（pH/温度/酶等） |
| `carrier_components` | TEXT | 载体成分 |
| `payload_items` | TEXT | 负载物 |

#### B. 生物相容性 (B1-B6)

| 字段 | 类型 | 说明 |
|------|------|------|
| `B1_tissue_tolerance` | TEXT | 组织耐受性 |
| `B1_tissue_tolerance_material` | TEXT | 相关物质 |
| `B2_cytocompatibility` | TEXT | 细胞相容性 |
| `B2_cytocompatibility_material` | TEXT | 相关物质 |
| `B3_interfacial_behavior` | TEXT | 界面行为 |
| `B3_interfacial_behavior_material` | TEXT | 相关物质 |
| `B4_immunomodulation` | TEXT | 免疫调节 |
| `B4_immunomodulation_material` | TEXT | 相关物质 |
| `B5_hemocompatibility` | TEXT | 血液相容性 |
| `B5_hemocompatibility_material` | TEXT | 相关物质 |
| `B6_residence_clearance` | TEXT | 留存与清除 |
| `B6_residence_clearance_material` | TEXT | 相关物质 |

#### F. 功能特性 (F1-F7)

| 字段 | 类型 | 说明 |
|------|------|------|
| `F1_localization_retention` | TEXT | 定位与滞留 |
| `F2_release_kinetics` | TEXT | 释放动力学 |
| `F3_selective_permeability` | TEXT | 选择性渗透 |
| `F4_stimulus_response` | TEXT | 刺激响应 |
| `F5_antifouling` | TEXT | 抗污损 |
| `F6_therapeutic_compatibility` | TEXT | 治疗协同性 |
| `F7_failure_management` | TEXT | 失效管理 |

#### I. 固有属性 (I1-I2)

| 字段 | 类型 | 说明 |
|------|------|------|
| `I1_chemical_composition` | TEXT | 化学组成 |
| `I2_gelation_modality` | TEXT | 成胶方式 |

#### C. 微生物相容性 (C1-C3)

| 字段 | 类型 | 说明 |
|------|------|------|
| `C1_viability_support` | TEXT | 活性支持 |
| `C2_microbial_compatibility` | TEXT | 微生物相容性 |
| `C3_protection_efficacy` | TEXT | 防护效能 |

#### P. 加工特性 (P1-P6)

| 字段 | 类型 | 说明 |
|------|------|------|
| `P1_gelation_pathway` | TEXT | 成胶路径 |
| `P2_rheology` | TEXT | 流变学特性 |
| `P3_processing_window` | TEXT | 加工窗口 |
| `P4_mechanical_stability` | TEXT | 机械稳定性 |
| `P5_process_route` | TEXT | 加工路线 |
| `P6_structural_construction` | TEXT | 结构构建 |

#### K. 负载指标

| 字段 | 类型 | 说明 |
|------|------|------|
| `K_loading_efficiency` | TEXT | 负载效率 |
| `K_encapsulation_method` | TEXT | 封装方法 |

#### M. 材料界面 (M1-M4)

| 字段 | 类型 | 说明 |
|------|------|------|
| `M1_moisture_balance` | TEXT | 湿润平衡 |
| `M2_conformability` | TEXT | 成形与贴合 |
| `M3_structural_stability` | TEXT | 结构稳定 |
| `M4_mass_transfer` | TEXT | 传质通道 |

#### R. 修复增益 (R1-R4)

| 字段 | 类型 | 说明 |
|------|------|------|
| `R1_inflammation_buffer` | TEXT | 炎症缓冲 |
| `R2_repair_signal_amplification` | TEXT | 信号放大 |
| `R3_microenvironment_tuning` | TEXT | 微环境调谐 |
| `R4_microbe_compatible` | TEXT | 菌藻共存 |

---

## 2️⃣ `micro_feat` - 微生物工程特征表

### 概述
存储微生物系统的详细工程特征，包括底盘生理、遗传工程、感知模块、效应模块和生物安全信息。

### 重要背景知识

| 效应模块 | 靶标/生产者 | 说明 |
|----------|-------------|------|
| **E_A_* 抗菌功能** | Bacillus subtilis (枯草芽孢杆菌) | 抗菌效果测试的标准靶标菌 |
| **E_B_* 产氧功能** | Chlorella vulgaris (普通小球藻) | 光合作用产氧的工程菌株 |

### 字段分类

#### A. 系统基本信息 (system_info)

| 字段 | 类型 | 说明 | 取值范围 |
|------|------|------|----------|
| `paper_id` | TEXT | 论文唯一标识符 | UUID |
| `system_index` | INTEGER | 系统序号 | 0, 1, 2... |
| `system_type` | TEXT | 系统类型 | `Single_Strain` / `Consortium` |
| `composition` | JSON | 系统组成（微生物数组） | 见下方说明 |
| `spatial_arrangement` | TEXT | 空间排布 | `Encapsulated` / `Biofilm` / `Suspension` |

**composition 字段结构：**
```json
[{
  "role": "Chassis | Helper",
  "scientific_name": "Escherichia coli",
  "strain_id": "Nissle 1917"
}]
```

- **Chassis**: 底盘菌/主工程菌
- **Helper**: 辅助菌

#### B. 底盘生理特征 (chassis_physiology) - 前缀 `C_`

| 字段 | 类型 | 说明 |
|------|------|------|
| `C_oxygen_tolerance` | TEXT | 氧耐受类型 (`Aerobic` / `Facultative` / `Anaerobic`) |
| `C_growth_conditions` | TEXT | 生长条件（温度、pH、营养、培养基等） |
| `C_growth_kinetics` | TEXT | 生长动力学（倍增时间、最大比生长速率等） |
| `C_colonization_niche` | TEXT | 定植生态位（肠道、皮肤创面、牙周袋等） |
| `C_microbiome_interaction` | TEXT | 与菌群互作（共生/竞争/抑制/协同等） |
| `C_stress_tolerance` | TEXT | 应激耐受（耐酸、耐胆盐、耐氧化、耐渗透压等） |
| `C_stress_tolerance_material` | TEXT | 负责该应激耐受的微生物（来自 composition） |
| `C_growth_desc` | TEXT | 中文总结（底盘生理概括） |

#### C. 遗传工程信息 (genetic_engineering) - 前缀 `G_`

| 字段 | 类型 | 说明 |
|------|------|------|
| `G_genetic_tools` | TEXT | 遗传工具（CRISPR、同源重组、质粒系统、转座子等） |
| `G_edit_efficiency` | TEXT | 编辑效率（成功率、突变率、编辑频率等） |
| `G_circuit_control` | TEXT | 回路控制方式（诱导型/组成型/开关型/反馈回路等） |
| `G_circuit_inducer_material` | TEXT | 执行回路调控的微生物（来自 composition） |
| `G_genetic_stability` | TEXT | 遗传稳定性（传代丢失率、质粒稳定等） |
| `G_material_coupling` | TEXT | 材料/环境耦合稳定性（凝胶、创面、缺氧环境） |
| `G_engineering_desc` | TEXT | 中文总结（遗传工程改造点） |

#### D. 感知模块 (sensing_modules) - 前缀 `S_`

| 字段 | 类型 | 说明 |
|------|------|------|
| `S_physiochemical_signals` | TEXT | 理化信号列表（Hypoxia/ROS/pH/temperature 等） |
| `S_metabolite_signals` | TEXT | 代谢物信号（Nitrate、bile acids 等） |
| `S_microbial_signals` | TEXT | 微生物信号（AHL、AI-2 等群体感应分子） |
| `S_host_signals` | TEXT | 宿主信号（Protease、炎症因子、NO 等） |
| `S_sensing_component_material` | TEXT | 负责感知元件的微生物（来自 composition） |
| `S_logic_gate_desc` | TEXT | 逻辑门描述（AND/OR/NOT 等信号组合） |
| `S_logic_desc` | TEXT | 中文总结（感知与逻辑控制） |

#### E. 效应模块 (effector_modules) - 前缀 `E_`

**通用字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `E_primary_functions` | TEXT | 主要功能数组（如 `Antibacterial`, `Oxygenation` 等） |
| `E_secretion_mech` | TEXT | 分泌/递送方式（分泌蛋白、外膜囊泡、裂解释放等） |
| `E_dosage_control` | TEXT | 剂量控制（诱导剂浓度、逻辑门、反馈控制等） |
| `E_material_match` | TEXT | 与材料体系匹配性（凝胶兼容、产气影响等） |

**E_A_* 抗菌模块（靶标：Bacillus subtilis）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `E_A_has_antibacterial` | BOOLEAN | 是否具备抗菌功能 |
| `E_A_broad_spectrum` | BOOLEAN | 是否广谱（覆盖金葡/铜绿等） |
| `E_A_biofilm_inhib` | BOOLEAN | 是否抑制生物膜 |
| `E_A_mechanism_desc` | TEXT | 机制（抗菌肽、产酸、H₂O₂、竞争性排斥等） |
| `E_A_agent_material` | TEXT | 负责抗菌的微生物（来自 composition） |
| `E_A_crit_broad_biofilm` | BOOLEAN | 标准 A1：广谱 + 抗生物膜 |
| `E_A_crit_controllable` | BOOLEAN | 标准 A2：活性可控、不过度损伤组织 |
| `E_A_crit_matrix_compat` | BOOLEAN | 标准 A3：不破坏凝胶结构、不过度产气 |
| `E_A_crit_safety` | BOOLEAN | 标准 A4：低细胞毒性、局部滞留 |
| `E_A_crit_evidence` | TEXT | 评判依据（中文说明） |

**E_B_* 产氧模块（生产者：Chlorella vulgaris）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `E_B_has_oxygenation` | BOOLEAN | 是否供氧 (True/False) |
| `E_B_mechanism_desc` | TEXT | 机制（光合产氧/分解过氧化物等） |
| `E_B_oxygen_material` | TEXT | 负责产氧的微生物（来自 composition） |
| `E_B_crit_sustained` | BOOLEAN | 标准 B1：持续供氧覆盖换药周期 |
| `E_B_crit_feasible` | BOOLEAN | 标准 B2：光照参数可行或非光依赖 |
| `E_B_crit_conflict` | BOOLEAN | 标准 B3：不促进病原菌且与抗菌协同 |
| `E_B_crit_evidence` | TEXT | 评判依据（中文说明） |

**E_C_* 免疫调节模块：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `E_C_has_immunomodulation` | BOOLEAN | 是否具备免疫调节 |
| `E_C_mechanism_desc` | TEXT | 免疫调节机制描述 |
| `E_C_modulator_material` | TEXT | 负责免疫调节的微生物 |

**E_D_* 组织修复模块：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `E_D_has_repair` | BOOLEAN | 是否具备组织修复 |
| `E_D_mechanism_desc` | TEXT | 修复机制描述 |
| `E_D_repair_material` | TEXT | 负责组织修复的微生物 |

**E_E_* 代谢调节模块：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `E_E_has_metabolic` | BOOLEAN | 是否具备代谢调节 |
| `E_E_mechanism_desc` | TEXT | 代谢调节机制描述 |
| `E_E_metabolite_material` | TEXT | 负责代谢调节的微生物 |

**E_F_* 肿瘤治疗模块：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `E_F_has_tumor` | BOOLEAN | 是否具备肿瘤治疗功能 |
| `E_F_mechanism_desc` | TEXT | 肿瘤治疗机制描述 |
| `E_F_agent_material` | TEXT | 负责肿瘤治疗的微生物 |

#### F. 生物安全与风险 (biosafety_risk) - 前缀 `B_`

| 字段 | 类型 | 说明 |
|------|------|------|
| `B_bsl_level` | TEXT | 安全等级（如 `BSL-1|GRAS`） |
| `B_biocontainment_strategy` | TEXT | 控制策略（自杀开关、营养缺陷、依赖性等） |
| `B_containment_material` | TEXT | 使用该控制策略的微生物（来自 composition） |
| `B_risk_assessment` | TEXT | 风险评估（潜在感染、水平基因转移等） |
| `B_material_barrier` | TEXT | 材料屏障（凝胶局部滞留、物理隔离等） |
| `B_risk_desc` | TEXT | 中文安全评估总结 |

#### G. 整体效果 (overall_performance)

| 字段 | 类型 | 说明 |
|------|------|------|
| `healing_efficacy_desc` | TEXT | 中文总体疗效描述 |

---

## 3️⃣ `paper_tags` - 论文分类标签表

### 概述
存储论文的分类信息和摘要，支持多级分类筛选。

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `paper_id` | TEXT (PK) | 论文唯一标识符 |
| `title` | TEXT | 论文标题 |
| `abstract` | TEXT | 论文摘要（中文） |
| `classification` | TEXT | 分类路径（如 `Delivery > Synthetic Polymers > Polyesters`） |
| `l1` | TEXT | 一级分类 |
| `l2` | TEXT | 二级分类 |
| `l3` | TEXT | 三级分类 |
| `reasoning` | TEXT | LLM 分类推理依据 |

### 分类体系示例

```
l1: Delivery
├── l2: Synthetic Polymers
│   ├── l3: Polyesters
│   ├── l3: Polyolefins
│   └── l3: ...
└── l2: Natural Polymers
    └── l3: ...

l1: Cell culture
└── l2: ...
```

---

## 4️⃣ `polymer_classification` - 高分子分类表

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER (PK) | 自增主键 |
| `高分子名称` | TEXT | 高分子名称 |
| `关联论文ID列表` | TEXT | 关联的论文 ID 列表 |
| `论文数量` | INTEGER | 关联论文数量 |

---

## 5️⃣ `experiment_conditions` - ATPS 实验条件表

### 概述
存储水性两相系统 (ATPS) 的实验条件信息。

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER (PK) | 自增主键 |
| `论文ID` | TEXT | 关联论文 ID |
| `是否包含相分离的研究` | TEXT | 是否研究相分离 |
| `是否进行物理实验` | TEXT | 是否进行物理实验 |
| `是否进行数值试验` | TEXT | 是否进行数值模拟 |
| `溶剂体系` | TEXT | 使用的溶剂体系 |
| `溶剂浓度` | TEXT | 溶剂浓度 |
| `温度` | TEXT | 实验温度 |
| `聚合物体积分数_质量分数` | TEXT | 聚合物浓度 |
| `其他参数` | TEXT | 其他实验参数 |

---

## 6️⃣ `experiment_results` - ATPS 实验结果表

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER (PK) | 自增主键 |
| `论文ID` | TEXT | 关联论文 ID |
| `什么浓度可以相分离` | TEXT | 相分离浓度阈值 |
| `盐浓度能否促进相分离` | TEXT | 盐浓度对相分离的影响 |
| `多少盐浓度能促进相分离` | TEXT | 促进相分离的盐浓度 |
| `温度能否促进相分离` | TEXT | 温度对相分离的影响 |
| `什么温度下能相分离` | TEXT | 相分离温度条件 |
| `相分离后两相体积分配` | TEXT | 两相体积比 |
| `相分离后双相中各分子浓度` | TEXT | 两相中的分子浓度 |
| `关键基团驱动力影响` | TEXT | 影响相分离的官能团（注：此字段可能不完全准确） |

---

## 🔗 表关联关系

```
paper_tags.paper_id ─────────┐
                             │
micro_feat.paper_id ─────────┼──► 论文主表 (paper_id 为唯一标识)
                             │
delivery_qwen.paper_id ──────┘

polymer_classification.关联论文ID列表 ──► 包含多个 paper_id
```

---

## 📝 常用查询示例

### 查找产氧微生物

```sql
SELECT paper_id, composition, E_B_mechanism_desc 
FROM micro_feat 
WHERE E_B_has_oxygenation = 'True'
```

### 查找特定分类的论文

```sql
SELECT title, abstract 
FROM paper_tags 
WHERE l1 = 'Delivery' AND l2 = 'Synthetic Polymers'
```

### 查找 pH 响应载体

```sql
SELECT system_name, carrier_components, F4_stimulus_response 
FROM delivery_qwen 
WHERE carrier_response LIKE '%pH%'
```

---

*文档由 BioExtract-AI 团队维护*
