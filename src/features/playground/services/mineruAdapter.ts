/**
 * MinerU OCR Adapter
 * 
 * Provides integration with MinerU API for document OCR processing.
 * Currently uses mock implementation - replace with real API when available.
 */

export interface MinerUConfig {
    apiUrl: string;
    apiKey: string;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    page?: number;
}

export interface TableData {
    rows: string[][];
    position: BoundingBox;
}

export interface FormulaData {
    latex: string;
    position: BoundingBox;
}

export interface ImageData {
    base64: string;
    position: BoundingBox;
}

export interface MinerURequest {
    file: File;
    options?: {
        language?: string;
        extractTables?: boolean;
        extractFormulas?: boolean;
        extractImages?: boolean;
    };
}

export interface MinerUResponse {
    success: boolean;
    text: string;
    pages: number;
    tables?: TableData[];
    formulas?: FormulaData[];
    images?: ImageData[];
    processingTime?: number;
    error?: string;
}

// Storage key for MinerU config
const MINERU_CONFIG_KEY = 'playground_mineru_config';

/**
 * Get stored MinerU configuration
 */
export function getMinerUConfig(): MinerUConfig | null {
    try {
        const stored = localStorage.getItem(MINERU_CONFIG_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load MinerU config:', e);
    }
    return null;
}

/**
 * Save MinerU configuration
 */
export function saveMinerUConfig(config: MinerUConfig): void {
    localStorage.setItem(MINERU_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Call MinerU API for document processing
 * 
 * API Endpoint: POST /file_parse
 * Based on: http://140.206.138.45:8000/docs
 */
export async function callMinerU(
    request: MinerURequest,
    config: MinerUConfig
): Promise<MinerUResponse> {
    // Validate config
    if (!config.apiUrl) {
        return {
            success: false,
            text: '',
            pages: 0,
            error: 'MinerU API URL is not configured',
        };
    }

    try {
        // Build FormData matching the API spec (based on user's curl command)
        const formData = new FormData();

        // files: Upload pdf or image files for parsing
        formData.append('files', request.file);

        // Required parameters based on API spec
        formData.append('return_middle_json', 'false');
        formData.append('return_model_output', 'false');
        formData.append('return_md', 'true');
        formData.append('return_images', 'true');
        formData.append('return_content_list', 'true');
        formData.append('response_format_zip', 'false');

        // Pagination
        formData.append('start_page_id', '0');
        formData.append('end_page_id', '99999');

        // Parse settings
        formData.append('parse_method', 'auto');
        formData.append('backend', 'vlm-http-client');
        formData.append('server_url', 'http://127.0.0.1:30000');
        formData.append('output_dir', './output');

        // Optional: Language list (empty for auto-detect)
        formData.append('lang_list', '');

        // table_enable: Enable table parsing
        formData.append('table_enable', request.options?.extractTables !== false ? 'true' : 'false');

        // formula_enable: Enable formula parsing
        formData.append('formula_enable', request.options?.extractFormulas !== false ? 'true' : 'false');

        console.log('[MinerU] Calling API:', config.apiUrl);
        const startTime = Date.now();

        // Determine if we should use proxy (for local development)
        // Use Vite proxy to avoid CORS issues
        const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const baseUrl = isLocalDev ? '/api/mineru' : config.apiUrl.replace(/\/$/, ''); // Remove trailing slash

        // Make API request (no auth header needed based on API spec)
        const response = await fetch(`${baseUrl}/file_parse`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const processingTime = Date.now() - startTime;

        console.log('[MinerU] Response received:', JSON.stringify(data).substring(0, 500));

        // Parse response - API returns nested structure:
        // { backend: "...", version: "...", results: { filename: { md_content: "..." } } }
        let markdownContent = '';

        if (data.results && typeof data.results === 'object') {
            // Get first result (usually the uploaded filename without extension)
            const resultKeys = Object.keys(data.results);
            if (resultKeys.length > 0) {
                const firstResult = data.results[resultKeys[0]];
                markdownContent = firstResult?.md_content || firstResult?.markdown || firstResult?.text || '';
            }
        } else {
            // Fallback to direct properties (old API format)
            markdownContent = data.md_content || data.markdown || data.text || '';
        }

        // Extract tables from content if present
        const tables: TableData[] = [];
        if (data.tables && Array.isArray(data.tables)) {
            data.tables.forEach((table: { rows?: string[][]; position?: BoundingBox }) => {
                if (table.rows) {
                    tables.push({
                        rows: table.rows,
                        position: table.position || { x: 0, y: 0, width: 0, height: 0 },
                    });
                }
            });
        }

        return {
            success: true,
            text: markdownContent,
            pages: data.pages || data.page_count || 1,
            tables: tables.length > 0 ? tables : undefined,
            formulas: data.formulas,
            images: data.images,
            processingTime,
        };
    } catch (error) {
        console.error('[MinerU] API call failed:', error);
        return {
            success: false,
            text: '',
            pages: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Mock implementation for testing without API
 */
export async function callMinerUMock(request: MinerURequest): Promise<MinerUResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const fileName = request.file.name;
    const isPDF = request.file.type === 'application/pdf';

    // Generate mock extracted text based on filename
    const mockText = generateMockText(fileName);

    return {
        success: true,
        text: mockText,
        pages: isPDF ? Math.floor(Math.random() * 10) + 1 : 1,
        tables: isPDF ? generateMockTables() : undefined,
        processingTime: Math.floor(Math.random() * 3000) + 500,
    };
}

function generateMockText(fileName: string): string {
    // Generate plausible mock text based on filename
    if (fileName.toLowerCase().includes('invoice')) {
        return `发票信息
供应商：ABC科技有限公司
发票号：INV-2024-${Math.floor(Math.random() * 10000)}
日期：2024-01-${Math.floor(Math.random() * 28) + 1}
金额：￥${(Math.random() * 10000).toFixed(2)}
税率：13%`;
    }

    if (fileName.toLowerCase().includes('paper') || fileName.toLowerCase().includes('research')) {
        return `Title: Analysis of Polymer-Based Drug Delivery Systems
Authors: Zhang Wei, Li Ming, Wang Fang
Journal: Journal of Biomedical Materials
Year: 2024
Abstract: This study investigates the application of biodegradable polymers...
Keywords: drug delivery, polymer, nanoparticles`;
    }

    // Default mock text
    return `Document: ${fileName}
Extracted Content:
This is a sample extracted text from the document.
The actual content will be provided by MinerU OCR.

Key Information:
- Document type: ${fileName.split('.').pop()?.toUpperCase()}
- Processing: Complete
- Confidence: 95%`;
}

function generateMockTables(): TableData[] {
    return [{
        rows: [
            ['Column A', 'Column B', 'Column C'],
            ['Data 1', 'Data 2', 'Data 3'],
            ['Data 4', 'Data 5', 'Data 6'],
        ],
        position: { x: 10, y: 100, width: 400, height: 150, page: 1 },
    }];
}
