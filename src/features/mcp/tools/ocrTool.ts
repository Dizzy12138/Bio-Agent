/**
 * OCR MCP Tool Implementation
 * 
 * Provides OCR capability via MinerU API or mock mode.
 * Can be called by Agent or used independently.
 */

import type { MCPToolParams, MCPToolResult } from '../types';
import { callMinerU, callMinerUMock, type MinerUResponse } from '../../playground/services/mineruAdapter';

export interface OCRToolInput {
    fileUrl?: string;  // URL to process
    file?: File;       // File object to process
}

export interface OCRToolOutput {
    text: string;
    tables?: Array<{
        data: string[][];
    }>;
    pageCount?: number;
}

/**
 * Execute OCR tool
 */
export async function executeOCRTool(
    params: MCPToolParams,
    config: Record<string, unknown>
): Promise<MCPToolResult> {
    const input = params.input as OCRToolInput;

    if (!input.fileUrl && !input.file) {
        return {
            success: false,
            output: null,
            error: 'Missing required input: fileUrl or file',
        };
    }

    try {
        const useMock = config.useMock as boolean ?? true;

        // Prepare file for processing
        let file: File;
        if (input.file) {
            file = input.file;
        } else if (input.fileUrl) {
            // Fetch file from URL
            const response = await fetch(input.fileUrl);
            const blob = await response.blob();
            const fileName = input.fileUrl.split('/').pop() || 'document';
            file = new File([blob], fileName, { type: blob.type });
        } else {
            return { success: false, output: null, error: 'No file provided' };
        }

        // Create MinerU request
        const request = { file };

        // Call OCR
        let result: MinerUResponse;
        if (useMock) {
            result = await callMinerUMock(request);
        } else {
            result = await callMinerU(request, {
                apiUrl: config.apiUrl as string,
                apiKey: config.apiKey as string,
            });
        }

        // Format output - adapt to MinerUResponse structure
        const output: OCRToolOutput = {
            text: result.text,
            tables: result.tables?.map(t => ({
                data: t.rows,
            })),
            pageCount: result.pages,
        };

        return {
            success: true,
            output,
        };
    } catch (e) {
        return {
            success: false,
            output: null,
            error: `OCR processing failed: ${String(e)}`,
        };
    }
}
