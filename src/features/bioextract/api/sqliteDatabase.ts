/**
 * BioExtract-AI SQLite 数据库服务
 * 使用 sql.js 在浏览器中运行 SQLite
 */

import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import * as XLSX from 'xlsx';

// 数据文件路径配置
export const DATA_FILES = {
    deliveryQwen: '/src/features/bioextract/data/delivery-qwen.csv',
    microFeat: '/src/features/bioextract/data/micro_feat.csv',
    tag: '/src/features/bioextract/data/tag.csv',
    atpsApplication: '/src/features/bioextract/data/ATPS应用20251219.xlsx',
    experimentData: '/src/features/bioextract/data/experiment_data_split.xlsx',
    extractionSummary: '/src/features/bioextract/data/extraction_summary_cleaned-20251125.xlsx',
} as const;

// 数据库表结构定义（基于实际数据文件的表头）
export const TABLE_SCHEMAS = {
    // 递送载体表 (82列，替代旧的 drug_delivery)
    delivery_qwen: {
        name: 'delivery_qwen',
        source: 'delivery-qwen.csv',
        columns: [
            // 基础信息 (1-7)
            { name: 'paper_id', type: 'TEXT' },
            { name: 'system_index', type: 'INTEGER' },
            { name: 'system_name', type: 'TEXT' },
            { name: 'carrier_type', type: 'TEXT' },
            { name: 'carrier_response', type: 'TEXT' },
            { name: 'carrier_components', type: 'TEXT' },
            { name: 'payload_items', type: 'TEXT' },
            // B_* 生物相容性 (8-19)
            { name: 'B1_tissue_tolerance', type: 'TEXT' },
            { name: 'B1_tissue_tolerance_material', type: 'TEXT' },
            { name: 'B2_cytocompatibility', type: 'TEXT' },
            { name: 'B2_cytocompatibility_material', type: 'TEXT' },
            { name: 'B3_interfacial_behavior', type: 'TEXT' },
            { name: 'B3_interfacial_behavior_material', type: 'TEXT' },
            { name: 'B4_immunomodulation', type: 'TEXT' },
            { name: 'B4_immunomodulation_material', type: 'TEXT' },
            { name: 'B5_hemocompatibility', type: 'TEXT' },
            { name: 'B5_hemocompatibility_material', type: 'TEXT' },
            { name: 'B6_residence_clearance', type: 'TEXT' },
            { name: 'B6_residence_clearance_material', type: 'TEXT' },
            // F_* 功能特性 (20-33)
            { name: 'F1_localization_retention', type: 'TEXT' },
            { name: 'F1_localization_retention_material', type: 'TEXT' },
            { name: 'F2_release_kinetics', type: 'TEXT' },
            { name: 'F2_release_kinetics_material', type: 'TEXT' },
            { name: 'F3_selective_permeability', type: 'TEXT' },
            { name: 'F3_selective_permeability_material', type: 'TEXT' },
            { name: 'F4_stimulus_response', type: 'TEXT' },
            { name: 'F4_stimulus_response_material', type: 'TEXT' },
            { name: 'F5_antifouling', type: 'TEXT' },
            { name: 'F5_antifouling_material', type: 'TEXT' },
            { name: 'F6_therapeutic_compatibility', type: 'TEXT' },
            { name: 'F6_therapeutic_compatibility_material', type: 'TEXT' },
            { name: 'F7_failure_management', type: 'TEXT' },
            { name: 'F7_failure_management_material', type: 'TEXT' },
            // I_* 固有属性 (34-36)
            { name: 'I1_chemical_composition', type: 'TEXT' },
            { name: 'I2_gelation_modality', type: 'TEXT' },
            { name: 'I2_gelation_modality_material', type: 'TEXT' },
            // C_* 微生物相容性 (37-42)
            { name: 'C1_viability_support', type: 'TEXT' },
            { name: 'C1_viability_support_material', type: 'TEXT' },
            { name: 'C2_microbial_compatibility', type: 'TEXT' },
            { name: 'C2_microbial_compatibility_material', type: 'TEXT' },
            { name: 'C3_protection_efficacy', type: 'TEXT' },
            { name: 'C3_protection_efficacy_material', type: 'TEXT' },
            // P_* 加工特性 (43-51)
            { name: 'P1_gelation_pathway', type: 'TEXT' },
            { name: 'P1_gelation_pathway_material', type: 'TEXT' },
            { name: 'P2_rheology', type: 'TEXT' },
            { name: 'P2_rheology_material', type: 'TEXT' },
            { name: 'P3_processing_window', type: 'TEXT' },
            { name: 'P4_mechanical_stability', type: 'TEXT' },
            { name: 'P4_mechanical_stability_material', type: 'TEXT' },
            { name: 'P5_process_route', type: 'TEXT' },
            { name: 'P6_structural_construction', type: 'TEXT' },
            // K_* 负载指标 (52-53)
            { name: 'K_loading_efficiency', type: 'TEXT' },
            { name: 'K_encapsulation_method', type: 'TEXT' },
            // M_* 材料界面 (54-65)
            { name: 'M1_moisture_balance', type: 'TEXT' },
            { name: 'M1_evidence', type: 'TEXT' },
            { name: 'M1_related_material', type: 'TEXT' },
            { name: 'M2_conformability', type: 'TEXT' },
            { name: 'M2_evidence', type: 'TEXT' },
            { name: 'M2_related_material', type: 'TEXT' },
            { name: 'M3_structural_stability', type: 'TEXT' },
            { name: 'M3_evidence', type: 'TEXT' },
            { name: 'M3_related_material', type: 'TEXT' },
            { name: 'M4_mass_transfer', type: 'TEXT' },
            { name: 'M4_evidence', type: 'TEXT' },
            { name: 'M4_related_material', type: 'TEXT' },
            // R_* 修复增益 (66-77)
            { name: 'R1_inflammation_buffer', type: 'TEXT' },
            { name: 'R1_evidence', type: 'TEXT' },
            { name: 'R1_related_material', type: 'TEXT' },
            { name: 'R2_repair_signal_amplification', type: 'TEXT' },
            { name: 'R2_evidence', type: 'TEXT' },
            { name: 'R2_related_material', type: 'TEXT' },
            { name: 'R3_microenvironment_tuning', type: 'TEXT' },
            { name: 'R3_evidence', type: 'TEXT' },
            { name: 'R3_related_material', type: 'TEXT' },
            { name: 'R4_microbe_compatible', type: 'TEXT' },
            { name: 'R4_evidence', type: 'TEXT' },
            { name: 'R4_related_material', type: 'TEXT' },
            // Token 统计 (78-80)
            { name: 'prompt_tokens', type: 'INTEGER' },
            { name: 'completion_tokens', type: 'INTEGER' },
            { name: 'total_tokens', type: 'INTEGER' },
            // 错误和原始响应 (81-82)
            { name: 'error', type: 'TEXT' },
            { name: 'raw_response', type: 'TEXT' },
        ],
    },
    polymer_classification: {
        name: 'polymer_classification',
        source: 'experiment_data_split.xlsx (高分子分类)',
        columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
            { name: '高分子名称', type: 'TEXT' },
            { name: '关联论文ID列表', type: 'TEXT' },
            { name: '论文数量', type: 'INTEGER' },
        ],
    },
    experiment_conditions: {
        name: 'experiment_conditions',
        source: 'experiment_data_split.xlsx (实验条件)',
        columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
            { name: '论文ID', type: 'TEXT' },
            { name: '是否包含相分离的研究', type: 'TEXT' },
            { name: '是否进行物理实验', type: 'TEXT' },
            { name: '是否进行数值试验', type: 'TEXT' },
            { name: '溶剂体系', type: 'TEXT' },
            { name: '溶剂浓度', type: 'TEXT' },
            { name: '温度', type: 'TEXT' },
            { name: '聚合物体积分数_质量分数', type: 'TEXT' },
            { name: '其他参数', type: 'TEXT' },
        ],
    },
    experiment_results: {
        name: 'experiment_results',
        source: 'experiment_data_split.xlsx (实验结果)',
        columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
            { name: '论文ID', type: 'TEXT' },
            { name: '什么浓度可以相分离', type: 'TEXT' },
            { name: '盐浓度能否促进相分离', type: 'TEXT' },
            { name: '多少盐浓度能促进相分离', type: 'TEXT' },
            { name: '温度能否促进相分离', type: 'TEXT' },
            { name: '什么温度下能相分离', type: 'TEXT' },
            { name: '相分离后两相体积分配', type: 'TEXT' },
            { name: '相分离后双相中各分子浓度', type: 'TEXT' },
            { name: '关键基团驱动力影响', type: 'TEXT' },
        ],
    },
    extraction_summary: {
        name: 'extraction_summary',
        source: 'extraction_summary_cleaned-20251125.xlsx',
        columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
            { name: '论文名', type: 'TEXT' },
            { name: 'markdown文件名', type: 'TEXT' },
            { name: '化学组成或官能团', type: 'TEXT' },
            { name: '物理实验', type: 'TEXT' },
            { name: '数值试验', type: 'TEXT' },
            { name: '溶剂体系', type: 'TEXT' },
            { name: '溶剂浓度', type: 'TEXT' },
            { name: '温度', type: 'TEXT' },
            { name: '聚合物体积分数_质量分数', type: 'TEXT' },
            { name: '其他参数', type: 'TEXT' },
        ],
    },
    atps_papers: {
        name: 'atps_papers',
        source: 'ATPS应用20251219.xlsx',
        columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
            { name: '包含PEGMA的论文', type: 'TEXT' },
        ],
    },
    // 新增：微生物特征表 (72列，完全匹配 CSV 字段)
    micro_feat: {
        name: 'micro_feat',
        source: 'micro_feat.csv',
        columns: [
            // 基础信息 (1-5)
            { name: 'paper_id', type: 'TEXT' },
            { name: 'system_index', type: 'INTEGER' },
            { name: 'system_type', type: 'TEXT' },
            { name: 'composition', type: 'TEXT' },
            { name: 'spatial_arrangement', type: 'TEXT' },
            // C_* 生长特性 (6-13)
            { name: 'C_oxygen_tolerance', type: 'TEXT' },
            { name: 'C_growth_conditions', type: 'TEXT' },
            { name: 'C_growth_kinetics', type: 'TEXT' },
            { name: 'C_colonization_niche', type: 'TEXT' },
            { name: 'C_microbiome_interaction', type: 'TEXT' },
            { name: 'C_stress_tolerance', type: 'TEXT' },
            { name: 'C_stress_tolerance_material', type: 'TEXT' },
            { name: 'C_growth_desc', type: 'TEXT' },
            // G_* 遗传工程 (14-20)
            { name: 'G_genetic_tools', type: 'TEXT' },
            { name: 'G_edit_efficiency', type: 'TEXT' },
            { name: 'G_circuit_control', type: 'TEXT' },
            { name: 'G_circuit_inducer_material', type: 'TEXT' },
            { name: 'G_genetic_stability', type: 'TEXT' },
            { name: 'G_material_coupling', type: 'TEXT' },
            { name: 'G_engineering_desc', type: 'TEXT' },
            // S_* 信号感知 (21-27)
            { name: 'S_physiochemical_signals', type: 'TEXT' },
            { name: 'S_metabolite_signals', type: 'TEXT' },
            { name: 'S_microbial_signals', type: 'TEXT' },
            { name: 'S_host_signals', type: 'TEXT' },
            { name: 'S_sensing_component_material', type: 'TEXT' },
            { name: 'S_logic_gate_desc', type: 'TEXT' },
            { name: 'S_logic_desc', type: 'TEXT' },
            // E_* 效应功能 (28-31)
            { name: 'E_primary_functions', type: 'TEXT' },
            { name: 'E_secretion_mech', type: 'TEXT' },
            { name: 'E_dosage_control', type: 'TEXT' },
            { name: 'E_material_match', type: 'TEXT' },
            // E_A_* 抗菌功能 (32-41)
            { name: 'E_A_has_antibacterial', type: 'TEXT' },
            { name: 'E_A_broad_spectrum', type: 'TEXT' },
            { name: 'E_A_biofilm_inhib', type: 'TEXT' },
            { name: 'E_A_mechanism_desc', type: 'TEXT' },
            { name: 'E_A_agent_material', type: 'TEXT' },
            { name: 'E_A_crit_broad_biofilm', type: 'TEXT' },
            { name: 'E_A_crit_controllable', type: 'TEXT' },
            { name: 'E_A_crit_matrix_compat', type: 'TEXT' },
            { name: 'E_A_crit_safety', type: 'TEXT' },
            { name: 'E_A_crit_evidence', type: 'TEXT' },
            // E_B_* 产氧功能 (42-48)
            { name: 'E_B_has_oxygenation', type: 'TEXT' },
            { name: 'E_B_mechanism_desc', type: 'TEXT' },
            { name: 'E_B_oxygen_material', type: 'TEXT' },
            { name: 'E_B_crit_sustained', type: 'TEXT' },
            { name: 'E_B_crit_feasible', type: 'TEXT' },
            { name: 'E_B_crit_conflict', type: 'TEXT' },
            { name: 'E_B_crit_evidence', type: 'TEXT' },
            // E_C_* 免疫调节 (49-51)
            { name: 'E_C_has_immunomodulation', type: 'TEXT' },
            { name: 'E_C_mechanism_desc', type: 'TEXT' },
            { name: 'E_C_modulator_material', type: 'TEXT' },
            // E_D_* 组织修复 (52-54)
            { name: 'E_D_has_repair', type: 'TEXT' },
            { name: 'E_D_mechanism_desc', type: 'TEXT' },
            { name: 'E_D_repair_material', type: 'TEXT' },
            // E_E_* 代谢调节 (55-57)
            { name: 'E_E_has_metabolic', type: 'TEXT' },
            { name: 'E_E_mechanism_desc', type: 'TEXT' },
            { name: 'E_E_metabolite_material', type: 'TEXT' },
            // E_F_* 肿瘤治疗 (58-60)
            { name: 'E_F_has_tumor', type: 'TEXT' },
            { name: 'E_F_mechanism_desc', type: 'TEXT' },
            { name: 'E_F_agent_material', type: 'TEXT' },
            // B_* 生物安全 (61-66)
            { name: 'B_bsl_level', type: 'TEXT' },
            { name: 'B_biocontainment_strategy', type: 'TEXT' },
            { name: 'B_containment_material', type: 'TEXT' },
            { name: 'B_risk_assessment', type: 'TEXT' },
            { name: 'B_material_barrier', type: 'TEXT' },
            { name: 'B_risk_desc', type: 'TEXT' },
            // 效果描述 (67)
            { name: 'healing_efficacy_desc', type: 'TEXT' },
            // Token 统计 (68-70)
            { name: 'prompt_tokens', type: 'INTEGER' },
            { name: 'completion_tokens', type: 'INTEGER' },
            { name: 'total_tokens', type: 'INTEGER' },
            // 错误和原始响应 (71-72)
            { name: 'error', type: 'TEXT' },
            { name: 'raw_response', type: 'TEXT' },
        ],
    },
    // 新增：论文标签表
    paper_tags: {
        name: 'paper_tags',
        source: 'tag.csv',
        columns: [
            { name: 'paper_id', type: 'TEXT PRIMARY KEY' },
            { name: 'title', type: 'TEXT' },
            { name: 'abstract', type: 'TEXT' },
            { name: 'classification', type: 'TEXT' },
            { name: 'l1', type: 'TEXT' },
            { name: 'l2', type: 'TEXT' },
            { name: 'l3', type: 'TEXT' },
            { name: 'reasoning', type: 'TEXT' },
        ],
    },
};

// 查询结果类型
export interface QueryResult {
    columns: string[];
    values: unknown[][];
    rowCount: number;
}

// 数据库状态
export interface DatabaseStatus {
    initialized: boolean;
    tables: {
        name: string;
        rowCount: number;
        source: string;
    }[];
    totalRows: number;
    error?: string;
}

/**
 * SQLite 数据库服务类
 */
class SQLiteDatabaseService {
    private SQL: SqlJsStatic | null = null;
    private db: Database | null = null;
    private initialized = false;
    private initPromise: Promise<void> | null = null;

    /**
     * 初始化 sql.js 引擎
     */
    async initSqlJs(): Promise<void> {
        if (this.SQL) return;

        console.log('[SQLiteDB] Initializing sql.js...');
        this.SQL = await initSqlJs({
            // 从 CDN 加载 WASM 文件
            locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
        });
        console.log('[SQLiteDB] sql.js initialized');
    }

    /**
     * 创建数据库并导入所有数据
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.initPromise) {
            await this.initPromise;
            return;
        }

        this.initPromise = this._doInitialize();
        await this.initPromise;
    }

    private async _doInitialize(): Promise<void> {
        try {
            await this.initSqlJs();

            if (!this.SQL) {
                throw new Error('sql.js not initialized');
            }

            // 创建新数据库
            this.db = new this.SQL.Database();
            console.log('[SQLiteDB] Database created');

            // 创建所有表
            this.createTables();

            // 导入数据
            await this.importAllData();

            this.initialized = true;
            console.log('[SQLiteDB] Database fully initialized');

        } catch (error) {
            console.error('[SQLiteDB] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * 创建所有表结构
     */
    private createTables(): void {
        if (!this.db) return;

        Object.values(TABLE_SCHEMAS).forEach(schema => {
            const columnsSQL = schema.columns
                .map(col => `"${col.name}" ${col.type}`)
                .join(', ');

            const createSQL = `CREATE TABLE IF NOT EXISTS "${schema.name}" (${columnsSQL})`;
            console.log(`[SQLiteDB] Creating table: ${schema.name}`);
            this.db!.run(createSQL);
        });

        console.log('[SQLiteDB] All tables created');
    }

    /**
     * 解析 CSV 行（处理引号内的逗号）
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    /**
     * 导入所有数据
     */
    private async importAllData(): Promise<void> {
        // 导入 Delivery Qwen CSV (递送载体)
        await this.importDeliveryQwenCSV();

        // 导入 Micro Feat CSV (微生物特征)
        await this.importMicroFeatCSV();

        // 导入 Tag CSV (论文标签)
        await this.importTagCSV();

        // 导入 Experiment Data XLSX
        await this.importExperimentDataXLSX();

        // 导入 Extraction Summary XLSX
        await this.importExtractionSummaryXLSX();

        // 导入 ATPS XLSX
        await this.importATPSXLSX();
    }

    /**
     * 导入 Delivery Qwen CSV (递送载体表)
     */
    private async importDeliveryQwenCSV(): Promise<void> {
        if (!this.db) return;

        console.log('[SQLiteDB] Importing delivery-qwen.csv...');

        try {
            const response = await fetch(DATA_FILES.deliveryQwen);
            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim());

            // 跳过标题行
            const dataLines = lines.slice(1);

            const schema = TABLE_SCHEMAS.delivery_qwen;
            const columnNames = schema.columns.map(c => `"${c.name}"`).join(', ');
            const placeholders = schema.columns.map(() => '?').join(', ');
            const insertSQL = `INSERT INTO "${schema.name}" (${columnNames}) VALUES (${placeholders})`;

            let insertedCount = 0;
            dataLines.forEach(line => {
                const values = this.parseCSVLine(line);
                if (values.length >= 5) { // 至少有核心字段
                    const processedValues = schema.columns.map((col, i) => {
                        const val = values[i] || '';
                        if (col.name === 'system_index') {
                            return parseInt(val) || 0;
                        }
                        if (col.type === 'INTEGER' && col.name.includes('tokens')) {
                            return parseInt(val) || 0;
                        }
                        return val;
                    });

                    try {
                        this.db!.run(insertSQL, processedValues);
                        insertedCount++;
                    } catch (e) {
                        // 静默处理插入错误
                    }
                }
            });

            console.log(`[SQLiteDB] Imported ${insertedCount} rows into delivery_qwen`);

        } catch (error) {
            console.error('[SQLiteDB] Failed to import delivery-qwen.csv:', error);
        }
    }

    /**
     * 导入 Micro Feat CSV (微生物特征表)
     */
    private async importMicroFeatCSV(): Promise<void> {
        if (!this.db) return;

        console.log('[SQLiteDB] Importing micro_feat.csv...');

        try {
            const response = await fetch(DATA_FILES.microFeat);
            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim());

            // 跳过标题行
            const dataLines = lines.slice(1);

            const schema = TABLE_SCHEMAS.micro_feat;
            const columnNames = schema.columns.map(c => `"${c.name}"`).join(', ');
            const placeholders = schema.columns.map(() => '?').join(', ');
            const insertSQL = `INSERT INTO "${schema.name}" (${columnNames}) VALUES (${placeholders})`;

            let insertedCount = 0;
            dataLines.forEach(line => {
                const values = this.parseCSVLine(line);
                if (values.length >= 5) { // 至少有前几个核心字段
                    const processedValues = schema.columns.map((col, i) => {
                        const val = values[i] || '';
                        if (col.name === 'system_index') {
                            return parseInt(val) || 0;
                        }
                        return val;
                    });

                    try {
                        this.db!.run(insertSQL, processedValues);
                        insertedCount++;
                    } catch (e) {
                        // 静默处理插入错误
                    }
                }
            });

            console.log(`[SQLiteDB] Imported ${insertedCount} rows into micro_feat`);

        } catch (error) {
            console.error('[SQLiteDB] Failed to import micro_feat.csv:', error);
        }
    }

    /**
     * 导入 Tag CSV (论文标签表)
     */
    private async importTagCSV(): Promise<void> {
        if (!this.db) return;

        console.log('[SQLiteDB] Importing tag.csv...');

        try {
            const response = await fetch(DATA_FILES.tag);
            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim());

            // 跳过标题行
            const dataLines = lines.slice(1);

            const schema = TABLE_SCHEMAS.paper_tags;
            const columnNames = schema.columns.map(c => `"${c.name}"`).join(', ');
            const placeholders = schema.columns.map(() => '?').join(', ');
            const insertSQL = `INSERT OR REPLACE INTO "${schema.name}" (${columnNames}) VALUES (${placeholders})`;

            let insertedCount = 0;
            dataLines.forEach(line => {
                const values = this.parseCSVLine(line);
                if (values.length >= 4 && values[0]) { // 至少有 paper_id 和几个核心字段
                    const processedValues = schema.columns.map((_, i) => values[i] || '');

                    try {
                        this.db!.run(insertSQL, processedValues);
                        insertedCount++;
                    } catch (e) {
                        // 静默处理插入错误
                    }
                }
            });

            console.log(`[SQLiteDB] Imported ${insertedCount} rows into paper_tags`);

        } catch (error) {
            console.error('[SQLiteDB] Failed to import tag.csv:', error);
        }
    }

    /**
     * 导入 Excel 文件
     */
    private async loadExcelFile(url: string): Promise<XLSX.WorkBook> {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return XLSX.read(arrayBuffer, { type: 'array' });
    }

    /**
     * 导入 Experiment Data XLSX
     */
    private async importExperimentDataXLSX(): Promise<void> {
        if (!this.db) return;

        console.log('[SQLiteDB] Importing experiment_data_split.xlsx...');

        try {
            const workbook = await this.loadExcelFile(DATA_FILES.experimentData);

            // 导入高分子分类
            if (workbook.SheetNames.includes('高分子分类')) {
                const sheet = workbook.Sheets['高分子分类'];
                const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

                data.forEach(row => {
                    this.db!.run(
                        'INSERT INTO polymer_classification ("高分子名称", "关联论文ID列表", "论文数量") VALUES (?, ?, ?)',
                        [
                            String(row['高分子名称'] || ''),
                            String(row['关联论文ID列表'] || ''),
                            Number(row['论文数量']) || 0,
                        ]
                    );
                });
                console.log(`[SQLiteDB] Imported ${data.length} rows into polymer_classification`);
            }

            // 导入实验条件
            if (workbook.SheetNames.includes('实验条件')) {
                const sheet = workbook.Sheets['实验条件'];
                const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

                data.forEach(row => {
                    this.db!.run(
                        `INSERT INTO experiment_conditions 
                         ("论文ID", "是否包含相分离的研究", "是否进行物理实验", "是否进行数值试验", 
                          "溶剂体系", "溶剂浓度", "温度", "聚合物体积分数_质量分数", "其他参数") 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            String(row['论文ID'] || ''),
                            String(row['是否包含相分离的研究'] || ''),
                            String(row['是否进行物理实验'] || ''),
                            String(row['是否进行数值试验'] || ''),
                            String(row['溶剂体系'] || ''),
                            String(row['溶剂浓度'] || ''),
                            String(row['温度'] || ''),
                            String(row['聚合物体积分数/质量分数'] || ''),
                            String(row['其他参数'] || ''),
                        ]
                    );
                });
                console.log(`[SQLiteDB] Imported ${data.length} rows into experiment_conditions`);
            }

            // 导入实验结果
            if (workbook.SheetNames.includes('实验结果')) {
                const sheet = workbook.Sheets['实验结果'];
                const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

                data.forEach(row => {
                    this.db!.run(
                        `INSERT INTO experiment_results 
                         ("论文ID", "什么浓度可以相分离", "盐浓度能否促进相分离", "多少盐浓度能促进相分离",
                          "温度能否促进相分离", "什么温度下能相分离", "相分离后两相体积分配", 
                          "相分离后双相中各分子浓度", "关键基团驱动力影响")
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            String(row['论文ID'] || ''),
                            String(row['什么浓度可以相分离？'] || ''),
                            String(row['盐浓度能否促进相分离？'] || ''),
                            String(row['多少盐浓度能促进相分离？'] || ''),
                            String(row['温度能否促进相分离？'] || ''),
                            String(row['什么温度下能相分离'] || ''),
                            String(row['相分离后两相体积分配？'] || ''),
                            String(row['相分离后双相中各分子浓度？'] || ''),
                            String(row['哪些关键基团对什么驱动力产生影响进而调节相分离的上述性质.'] || ''),
                        ]
                    );
                });
                console.log(`[SQLiteDB] Imported ${data.length} rows into experiment_results`);
            }

        } catch (error) {
            console.error('[SQLiteDB] Failed to import experiment_data_split.xlsx:', error);
        }
    }

    /**
     * 导入 Extraction Summary XLSX
     */
    private async importExtractionSummaryXLSX(): Promise<void> {
        if (!this.db) return;

        console.log('[SQLiteDB] Importing extraction_summary_cleaned.xlsx...');

        try {
            const workbook = await this.loadExcelFile(DATA_FILES.extractionSummary);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

            data.forEach(row => {
                this.db!.run(
                    `INSERT INTO extraction_summary 
                     ("论文名", "markdown文件名", "化学组成或官能团", "物理实验", "数值试验",
                      "溶剂体系", "溶剂浓度", "温度", "聚合物体积分数_质量分数", "其他参数")
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        String(row['论文名'] || ''),
                        String(row['markdown文件名'] || ''),
                        String(row['化学组成或官能团'] || ''),
                        String(row['物理实验'] || ''),
                        String(row['数值试验'] || ''),
                        String(row['溶剂体系'] || ''),
                        String(row['溶剂浓度'] || ''),
                        String(row['温度'] || ''),
                        String(row['聚合物体积分数/质量分数'] || ''),
                        String(row['其他参数'] || ''),
                    ]
                );
            });

            console.log(`[SQLiteDB] Imported ${data.length} rows into extraction_summary`);

        } catch (error) {
            console.error('[SQLiteDB] Failed to import extraction_summary.xlsx:', error);
        }
    }

    /**
     * 导入 ATPS XLSX
     */
    private async importATPSXLSX(): Promise<void> {
        if (!this.db) return;

        console.log('[SQLiteDB] Importing ATPS应用.xlsx...');

        try {
            const workbook = await this.loadExcelFile(DATA_FILES.atpsApplication);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

            data.forEach(row => {
                this.db!.run(
                    'INSERT INTO atps_papers ("包含PEGMA的论文") VALUES (?)',
                    [String(row['包含PEGMA的论文'] || '')]
                );
            });

            console.log(`[SQLiteDB] Imported ${data.length} rows into atps_papers`);

        } catch (error) {
            console.error('[SQLiteDB] Failed to import ATPS.xlsx:', error);
        }
    }

    /**
     * 执行 SQL 查询
     */
    async query(sql: string, params?: unknown[]): Promise<QueryResult> {
        await this.initialize();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        console.log('[SQLiteDB] Executing query:', sql);

        try {
            const result = this.db.exec(sql, params);

            if (result.length === 0) {
                return { columns: [], values: [], rowCount: 0 };
            }

            const queryResult = result[0];
            return {
                columns: queryResult.columns,
                values: queryResult.values,
                rowCount: queryResult.values.length,
            };

        } catch (error) {
            console.error('[SQLiteDB] Query failed:', error);
            throw error;
        }
    }

    /**
     * 执行 SQL 修改语句
     */
    async run(sql: string, params?: unknown[]): Promise<void> {
        await this.initialize();

        if (!this.db) {
            throw new Error('Database not initialized');
        }

        this.db.run(sql, params);
    }

    /**
     * 获取数据库状态
     */
    async getStatus(): Promise<DatabaseStatus> {
        await this.initialize();

        if (!this.db) {
            return {
                initialized: false,
                tables: [],
                totalRows: 0,
                error: 'Database not initialized',
            };
        }

        const tables: DatabaseStatus['tables'] = [];
        let totalRows = 0;

        Object.values(TABLE_SCHEMAS).forEach(schema => {
            try {
                const result = this.db!.exec(`SELECT COUNT(*) as count FROM "${schema.name}"`);
                const count = result[0]?.values[0]?.[0] as number || 0;
                tables.push({
                    name: schema.name,
                    rowCount: count,
                    source: schema.source,
                });
                totalRows += count;
            } catch (error) {
                console.warn(`[SQLiteDB] Failed to get count for table ${schema.name}:`, error);
                tables.push({
                    name: schema.name,
                    rowCount: 0,
                    source: schema.source,
                });
            }
        });

        return {
            initialized: this.initialized,
            tables,
            totalRows,
        };
    }

    /**
     * 获取表结构信息
     */
    getTableSchemas(): typeof TABLE_SCHEMAS {
        return TABLE_SCHEMAS;
    }

    /**
     * 获取所有表名
     */
    getTableNames(): string[] {
        return Object.values(TABLE_SCHEMAS).map(s => s.name);
    }

    /**
     * 导出数据库为二进制
     */
    exportDatabase(): Uint8Array | null {
        if (!this.db) return null;
        return this.db.export();
    }

    /**
     * 关闭数据库
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
        }
    }
}

// 单例导出
export const sqliteDb = new SQLiteDatabaseService();

export default sqliteDb;
