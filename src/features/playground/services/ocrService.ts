/**
 * OCR Service
 * 
 * Manages document OCR processing with support for batch operations.
 * Uses pluggable adapters (MinerU, Mock) for actual OCR processing.
 */

import {
    callMinerU,
    callMinerUMock,
    getMinerUConfig,
    saveMinerUConfig, // Import save function to sync config
    type MinerUResponse,
    type TableData,
} from './mineruAdapter';
import { getToolById } from '../../mcp/registry'; // Import Registry

// =============================================
// Types
// =============================================

export type OCRProvider = 'mineru' | 'mock';

export interface OCRConfig {
    provider: OCRProvider;
    apiUrl?: string;
    apiKey?: string;
    concurrency?: number; // Max parallel requests
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface ProcessedDocument {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    status: ProcessingStatus;
    progress: number; // 0-100
    extractedText?: string;
    tables?: TableData[];
    pages?: number;
    processingTime?: number;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
}

export interface BatchProgress {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    currentFile?: string;
}

export type ProgressCallback = (progress: BatchProgress) => void;

// =============================================
// OCR Config Management
// =============================================

const OCR_CONFIG_KEY = 'playground_ocr_config';

export function getOCRConfig(): OCRConfig {
    // 1. Try to get config from MCP Registry (Source of Truth)
    const mcpTool = getToolById('mcp-ocr');

    if (mcpTool && mcpTool.enabled) {
        const useMock = mcpTool.config?.useMock === true;
        const apiUrl = mcpTool.config?.apiUrl as string;

        // Sync to MinerU Adapter config for consistency
        if (apiUrl) {
            saveMinerUConfig({ apiUrl, apiKey: '' });
        }

        return {
            provider: useMock ? 'mock' : 'mineru',
            apiUrl: apiUrl,
            concurrency: 3
        };
    }

    // 2. Fallback to local storage (Legacy)
    try {
        const stored = localStorage.getItem(OCR_CONFIG_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load OCR config:', e);
    }

    // 3. Default
    return { provider: 'mock', concurrency: 3 };
}

export function saveOCRConfig(config: OCRConfig): void {
    localStorage.setItem(OCR_CONFIG_KEY, JSON.stringify(config));
}

// =============================================
// Single Document Processing
// =============================================

/**
 * Process a single document through OCR
 */
export async function processDocument(
    file: File,
    config: OCRConfig = getOCRConfig()
): Promise<ProcessedDocument> {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const doc: ProcessedDocument = {
        id: docId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        status: 'processing',
        progress: 0,
        createdAt: new Date(),
    };

    try {
        let response: MinerUResponse;

        if (config.provider === 'mineru') {
            const mineruConfig = getMinerUConfig();
            if (!mineruConfig) {
                throw new Error('MinerU configuration not found');
            }
            response = await callMinerU({ file }, mineruConfig);
        } else {
            // Use mock adapter
            response = await callMinerUMock({ file });
        }

        if (!response.success) {
            throw new Error(response.error || 'OCR processing failed');
        }

        return {
            ...doc,
            status: 'completed',
            progress: 100,
            extractedText: response.text,
            tables: response.tables,
            pages: response.pages,
            processingTime: response.processingTime,
            completedAt: new Date(),
        };
    } catch (error) {
        return {
            ...doc,
            status: 'error',
            progress: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
        };
    }
}

// =============================================
// Batch Processing
// =============================================

/**
 * Process multiple documents with concurrency control
 */
export async function batchProcess(
    files: File[],
    config: OCRConfig = getOCRConfig(),
    onProgress?: ProgressCallback
): Promise<ProcessedDocument[]> {
    const results: ProcessedDocument[] = [];
    const concurrency = config.concurrency || 3;

    const progress: BatchProgress = {
        total: files.length,
        completed: 0,
        failed: 0,
        inProgress: 0,
    };

    // Process in batches
    for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency);
        progress.inProgress = batch.length;

        const batchPromises = batch.map(async (file) => {
            progress.currentFile = file.name;
            onProgress?.(progress);

            const result = await processDocument(file, config);

            if (result.status === 'completed') {
                progress.completed++;
            } else {
                progress.failed++;
            }
            progress.inProgress--;
            onProgress?.(progress);

            return result;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    return results;
}

// =============================================
// Utility Functions
// =============================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if a file type is supported for OCR
 */
export function isSupportedFile(file: File): boolean {
    const supportedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/tiff',
        'image/bmp',
    ];
    return supportedTypes.includes(file.type);
}

/**
 * Get supported file extensions for file input
 */
export function getSupportedExtensions(): string {
    return '.pdf,.png,.jpg,.jpeg,.tiff,.bmp';
}
