/**
 * BioExtract-AI 数据服务
 * 从 data 目录加载真实数据文件（CSV 和 XLSX）
 */

import * as XLSX from 'xlsx';

// 数据文件路径配置
export const DATA_FILES = {
    drugDelivery: '/src/features/bioextract/data/drug_delivery.csv',
    atpsApplication: '/src/features/bioextract/data/ATPS应用20251219.xlsx',
    experimentData: '/src/features/bioextract/data/experiment_data_split.xlsx',
    extractionSummary: '/src/features/bioextract/data/extraction_summary_cleaned-20251125.xlsx',
} as const;

// Drug Delivery CSV 记录类型
export interface DrugDeliveryRecord {
    paper_id: string;
    标题: string;
    总结: string;
    分类: string;
    是否核心相关: boolean;
    相关性理由: string;
    载体设计_聚合物名称: string;
    载体设计_载体形态: string;
    载体设计_响应机制: string;
    负载物信息_名称: string;
    负载物信息_类型: string;
    负载物信息_形态状态: string;
    微生物指标_包埋效率: string;
    微生物指标_保护性能: string;
    微生物指标_释放后活性: string;
    微生物指标_泄露控制: string;
    释放特性_触发条件: string;
    释放特性_释放动力学: string;
}

// ATPS 应用记录类型
export interface ATPSApplicationRecord {
    [key: string]: string | number | boolean | undefined;
}

// 实验数据记录类型
export interface ExperimentDataRecord {
    [key: string]: string | number | boolean | undefined;
}

// 提取摘要记录类型
export interface ExtractionSummaryRecord {
    [key: string]: string | number | boolean | undefined;
}

// 数据源状态
export interface DataSourceStatus {
    drugDelivery: {
        loaded: boolean;
        recordCount: number;
        error?: string;
    };
    atpsApplication: {
        loaded: boolean;
        recordCount: number;
        sheetNames?: string[];
        error?: string;
    };
    experimentData: {
        loaded: boolean;
        recordCount: number;
        sheetNames?: string[];
        error?: string;
    };
    extractionSummary: {
        loaded: boolean;
        recordCount: number;
        sheetNames?: string[];
        error?: string;
    };
}

// 数据服务类
class DataService {
    private drugDeliveryData: DrugDeliveryRecord[] = [];
    private atpsApplicationData: Map<string, ATPSApplicationRecord[]> = new Map();
    private experimentData: Map<string, ExperimentDataRecord[]> = new Map();
    private extractionSummaryData: Map<string, ExtractionSummaryRecord[]> = new Map();

    private isLoaded = {
        drugDelivery: false,
        atpsApplication: false,
        experimentData: false,
        extractionSummary: false,
    };

    private loadingPromise: Promise<void> | null = null;

    // 解析 CSV 行（处理引号内的逗号）
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

    // 加载 Drug Delivery CSV 数据
    async loadDrugDeliveryData(): Promise<DrugDeliveryRecord[]> {
        if (this.isLoaded.drugDelivery) {
            return this.drugDeliveryData;
        }

        try {
            console.log('[DataService] Loading drug_delivery.csv...');
            const response = await fetch(DATA_FILES.drugDelivery);
            if (!response.ok) {
                throw new Error(`Failed to load drug_delivery.csv: ${response.status}`);
            }

            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim());

            // 解析标题行
            const headers = this.parseCSVLine(lines[0]);

            // 解析数据行
            this.drugDeliveryData = lines.slice(1).map(line => {
                const values = this.parseCSVLine(line);
                const record: Record<string, string | boolean> = {};

                headers.forEach((header, index) => {
                    const cleanHeader = header.replace(/^\uFEFF/, ''); // 移除 BOM
                    const value = values[index] || '';

                    if (cleanHeader === '是否核心相关') {
                        record[cleanHeader] = value.toUpperCase() === 'TRUE';
                    } else {
                        record[cleanHeader] = value;
                    }
                });

                return record as unknown as DrugDeliveryRecord;
            });

            this.isLoaded.drugDelivery = true;
            console.log(`[DataService] Loaded ${this.drugDeliveryData.length} drug delivery records`);
            return this.drugDeliveryData;

        } catch (error) {
            console.error('[DataService] Failed to load drug_delivery.csv:', error);
            throw error;
        }
    }

    // 加载 Excel 文件
    private async loadExcelFile(url: string): Promise<XLSX.WorkBook> {
        console.log(`[DataService] Loading Excel file: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        return workbook;
    }

    // 将 Excel Sheet 转换为记录数组
    private sheetToRecords<T extends Record<string, unknown>>(workbook: XLSX.WorkBook, sheetName: string): T[] {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            console.warn(`[DataService] Sheet "${sheetName}" not found`);
            return [];
        }

        const records = XLSX.utils.sheet_to_json<T>(sheet, { defval: '' });
        return records;
    }

    // 加载 ATPS 应用数据
    async loadATPSApplicationData(): Promise<Map<string, ATPSApplicationRecord[]>> {
        if (this.isLoaded.atpsApplication) {
            return this.atpsApplicationData;
        }

        try {
            const workbook = await this.loadExcelFile(DATA_FILES.atpsApplication);

            for (const sheetName of workbook.SheetNames) {
                const records = this.sheetToRecords<ATPSApplicationRecord>(workbook, sheetName);
                this.atpsApplicationData.set(sheetName, records);
                console.log(`[DataService] ATPS Sheet "${sheetName}": ${records.length} records`);
            }

            this.isLoaded.atpsApplication = true;
            return this.atpsApplicationData;

        } catch (error) {
            console.error('[DataService] Failed to load ATPS应用20251219.xlsx:', error);
            throw error;
        }
    }

    // 加载实验数据
    async loadExperimentData(): Promise<Map<string, ExperimentDataRecord[]>> {
        if (this.isLoaded.experimentData) {
            return this.experimentData;
        }

        try {
            const workbook = await this.loadExcelFile(DATA_FILES.experimentData);

            for (const sheetName of workbook.SheetNames) {
                const records = this.sheetToRecords<ExperimentDataRecord>(workbook, sheetName);
                this.experimentData.set(sheetName, records);
                console.log(`[DataService] Experiment Sheet "${sheetName}": ${records.length} records`);
            }

            this.isLoaded.experimentData = true;
            return this.experimentData;

        } catch (error) {
            console.error('[DataService] Failed to load experiment_data_split.xlsx:', error);
            throw error;
        }
    }

    // 加载提取摘要数据
    async loadExtractionSummaryData(): Promise<Map<string, ExtractionSummaryRecord[]>> {
        if (this.isLoaded.extractionSummary) {
            return this.extractionSummaryData;
        }

        try {
            const workbook = await this.loadExcelFile(DATA_FILES.extractionSummary);

            for (const sheetName of workbook.SheetNames) {
                const records = this.sheetToRecords<ExtractionSummaryRecord>(workbook, sheetName);
                this.extractionSummaryData.set(sheetName, records);
                console.log(`[DataService] Extraction Sheet "${sheetName}": ${records.length} records`);
            }

            this.isLoaded.extractionSummary = true;
            return this.extractionSummaryData;

        } catch (error) {
            console.error('[DataService] Failed to load extraction_summary_cleaned-20251125.xlsx:', error);
            throw error;
        }
    }

    // 加载所有数据
    async loadAllData(): Promise<void> {
        const results = await Promise.allSettled([
            this.loadDrugDeliveryData(),
            this.loadATPSApplicationData(),
            this.loadExperimentData(),
            this.loadExtractionSummaryData(),
        ]);

        results.forEach((result, index) => {
            const names = ['Drug Delivery', 'ATPS Application', 'Experiment Data', 'Extraction Summary'];
            if (result.status === 'rejected') {
                console.error(`[DataService] Failed to load ${names[index]}:`, result.reason);
            }
        });
    }

    // 确保数据已加载
    async ensureLoaded(): Promise<void> {
        if (Object.values(this.isLoaded).every(v => v)) return;

        if (!this.loadingPromise) {
            this.loadingPromise = this.loadAllData().finally(() => {
                this.loadingPromise = null;
            });
        }

        await this.loadingPromise;
    }

    // 获取数据状态
    getStatus(): DataSourceStatus {
        // 计算 ATPS 总记录数
        let atpsTotalCount = 0;
        const atpsSheetNames: string[] = [];
        this.atpsApplicationData.forEach((records, sheetName) => {
            atpsTotalCount += records.length;
            atpsSheetNames.push(sheetName);
        });

        // 计算实验数据总记录数
        let experimentTotalCount = 0;
        const experimentSheetNames: string[] = [];
        this.experimentData.forEach((records, sheetName) => {
            experimentTotalCount += records.length;
            experimentSheetNames.push(sheetName);
        });

        // 计算提取摘要总记录数
        let extractionTotalCount = 0;
        const extractionSheetNames: string[] = [];
        this.extractionSummaryData.forEach((records, sheetName) => {
            extractionTotalCount += records.length;
            extractionSheetNames.push(sheetName);
        });

        return {
            drugDelivery: {
                loaded: this.isLoaded.drugDelivery,
                recordCount: this.drugDeliveryData.length,
            },
            atpsApplication: {
                loaded: this.isLoaded.atpsApplication,
                recordCount: atpsTotalCount,
                sheetNames: atpsSheetNames,
            },
            experimentData: {
                loaded: this.isLoaded.experimentData,
                recordCount: experimentTotalCount,
                sheetNames: experimentSheetNames,
            },
            extractionSummary: {
                loaded: this.isLoaded.extractionSummary,
                recordCount: extractionTotalCount,
                sheetNames: extractionSheetNames,
            },
        };
    }

    // ========== Drug Delivery 数据查询方法 ==========

    getAllDrugDeliveryRecords(): DrugDeliveryRecord[] {
        return this.drugDeliveryData;
    }

    getCoreRelevantRecords(): DrugDeliveryRecord[] {
        return this.drugDeliveryData.filter(r => r.是否核心相关);
    }

    searchByPolymer(polymerName: string): DrugDeliveryRecord[] {
        const lowerName = polymerName.toLowerCase();
        return this.drugDeliveryData.filter(r =>
            r.载体设计_聚合物名称?.toLowerCase().includes(lowerName)
        );
    }

    searchByCarrierForm(form: string): DrugDeliveryRecord[] {
        const lowerForm = form.toLowerCase();
        return this.drugDeliveryData.filter(r =>
            r.载体设计_载体形态?.toLowerCase().includes(lowerForm)
        );
    }

    searchByResponseMechanism(mechanism: string): DrugDeliveryRecord[] {
        const lowerMech = mechanism.toLowerCase();
        return this.drugDeliveryData.filter(r =>
            r.载体设计_响应机制?.toLowerCase().includes(lowerMech)
        );
    }

    searchByPayloadType(type: string): DrugDeliveryRecord[] {
        const lowerType = type.toLowerCase();
        return this.drugDeliveryData.filter(r =>
            r.负载物信息_类型?.toLowerCase().includes(lowerType)
        );
    }

    // ========== ATPS 数据查询方法 ==========

    getATPSSheetNames(): string[] {
        return Array.from(this.atpsApplicationData.keys());
    }

    getATPSRecordsBySheet(sheetName: string): ATPSApplicationRecord[] {
        return this.atpsApplicationData.get(sheetName) || [];
    }

    getAllATPSRecords(): ATPSApplicationRecord[] {
        const allRecords: ATPSApplicationRecord[] = [];
        this.atpsApplicationData.forEach(records => allRecords.push(...records));
        return allRecords;
    }

    // ========== 实验数据查询方法 ==========

    getExperimentSheetNames(): string[] {
        return Array.from(this.experimentData.keys());
    }

    getExperimentRecordsBySheet(sheetName: string): ExperimentDataRecord[] {
        return this.experimentData.get(sheetName) || [];
    }

    getAllExperimentRecords(): ExperimentDataRecord[] {
        const allRecords: ExperimentDataRecord[] = [];
        this.experimentData.forEach(records => allRecords.push(...records));
        return allRecords;
    }

    // ========== 提取摘要查询方法 ==========

    getExtractionSheetNames(): string[] {
        return Array.from(this.extractionSummaryData.keys());
    }

    getExtractionRecordsBySheet(sheetName: string): ExtractionSummaryRecord[] {
        return this.extractionSummaryData.get(sheetName) || [];
    }

    getAllExtractionRecords(): ExtractionSummaryRecord[] {
        const allRecords: ExtractionSummaryRecord[] = [];
        this.extractionSummaryData.forEach(records => allRecords.push(...records));
        return allRecords;
    }

    // ========== 辅助方法 ==========

    /**
     * 通用方法：从 DrugDelivery 数据中提取唯一值
     */
    private getUniqueValues(fieldExtractor: (r: DrugDeliveryRecord) => string | undefined): string[] {
        const values = new Set<string>();
        this.drugDeliveryData.forEach(r => {
            const value = fieldExtractor(r);
            if (value) {
                values.add(value);
            }
        });
        return Array.from(values);
    }

    getUniquePolymers(): string[] {
        return this.getUniqueValues(r => r.载体设计_聚合物名称);
    }

    getUniqueCarrierForms(): string[] {
        return this.getUniqueValues(r => r.载体设计_载体形态);
    }

    getUniqueResponseMechanisms(): string[] {
        return this.getUniqueValues(r => r.载体设计_响应机制);
    }

    // 构建数据上下文（用于 LLM）
    buildDataContext(): string {
        const status = this.getStatus();
        const coreRecords = this.getCoreRelevantRecords();
        const polymers = this.getUniquePolymers().slice(0, 20);
        const forms = this.getUniqueCarrierForms().slice(0, 15);
        const mechanisms = this.getUniqueResponseMechanisms().slice(0, 15);

        // ATPS 数据摘要
        const atpsSheets = this.getATPSSheetNames();
        let atpsSummary = '';
        if (atpsSheets.length > 0) {
            atpsSummary = `
### 2. ATPS 应用数据 (ATPS应用20251219.xlsx)
- 工作表：${atpsSheets.join(', ')}
- 总记录数：${status.atpsApplication.recordCount}
${atpsSheets.map(sheet => {
                const records = this.getATPSRecordsBySheet(sheet);
                const fields = records[0] ? Object.keys(records[0]).slice(0, 5).join(', ') : '无';
                return `  - ${sheet}: ${records.length} 条 (字段: ${fields}...)`;
            }).join('\n')}`;
        }

        // 实验数据摘要
        const experimentSheets = this.getExperimentSheetNames();
        let experimentSummary = '';
        if (experimentSheets.length > 0) {
            experimentSummary = `
### 3. 实验数据 (experiment_data_split.xlsx)
- 工作表：${experimentSheets.join(', ')}
- 总记录数：${status.experimentData.recordCount}`;
        }

        // 提取摘要数据
        const extractionSheets = this.getExtractionSheetNames();
        let extractionSummary = '';
        if (extractionSheets.length > 0) {
            extractionSummary = `
### 4. 提取摘要 (extraction_summary_cleaned-20251125.xlsx)
- 工作表：${extractionSheets.join(', ')}
- 总记录数：${status.extractionSummary.recordCount}`;
        }

        return `
## 已加载的数据源

### 1. Drug Delivery 数据库 (drug_delivery.csv)
- 总记录数: ${status.drugDelivery.recordCount}
- 核心相关记录: ${coreRecords.length}
- 数据字段: paper_id, 标题, 总结, 分类, 是否核心相关, 相关性理由, 载体设计_聚合物名称, 载体设计_载体形态, 载体设计_响应机制, 负载物信息_名称, 负载物信息_类型, 负载物信息_形态状态, 微生物指标_包埋效率, 微生物指标_保护性能, 微生物指标_释放后活性, 微生物指标_泄露控制, 释放特性_触发条件, 释放特性_释放动力学
${atpsSummary}
${experimentSummary}
${extractionSummary}

### 常见聚合物（前20种）
${polymers.map((p, i) => `${i + 1}. ${p}`).join('\n')}

### 常见载体形态（前15种）
${forms.map((f, i) => `${i + 1}. ${f}`).join('\n')}

### 常见响应机制（前15种）
${mechanisms.map((m, i) => `${i + 1}. ${m}`).join('\n')}

### 核心相关记录示例（前5条）
${coreRecords.slice(0, 5).map((r, i) => `
**${i + 1}. ${r.标题}**
- 聚合物: ${r.载体设计_聚合物名称 || '未指定'}
- 载体形态: ${r.载体设计_载体形态 || '未指定'}
- 响应机制: ${r.载体设计_响应机制 || '未指定'}
- 负载物: ${r.负载物信息_名称 || '未指定'} (${r.负载物信息_类型 || '未指定'})
- 释放动力学: ${r.释放特性_释放动力学 || '未指定'}
`).join('\n')}
`;
    }
}

// 单例导出
export const dataService = new DataService();

export default dataService;
