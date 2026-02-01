/**
 * BioExtract Query MCP Tools
 *
 * Provides direct access to BioExtract backend query endpoints.
 */

import type { MCPToolParams, MCPToolResult } from '../types';
import { bioextractAPI } from '../../bioextract/api/bioextractAPI';

export interface QueryDeliverySystemsInput {
    paper_id?: string;
    carrier_type?: string;
    system_name?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
}

export interface QueryMicroFeaturesInput {
    paper_id?: string;
    system_type?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
}

/**
 * Execute delivery systems query tool.
 */
export async function executeQueryDeliverySystemsTool(
    params: MCPToolParams
): Promise<MCPToolResult> {
    const input = params.input as QueryDeliverySystemsInput;

    try {
        const data = await bioextractAPI.getDeliverySystems(input);
        return {
            success: true,
            output: data,
        };
    } catch (e) {
        return {
            success: false,
            output: null,
            error: `查询递送系统失败: ${String(e)}`,
        };
    }
}

/**
 * Execute micro features query tool.
 */
export async function executeQueryMicroFeaturesTool(
    params: MCPToolParams
): Promise<MCPToolResult> {
    const input = params.input as QueryMicroFeaturesInput;

    try {
        const data = await bioextractAPI.getMicroFeatures(input);
        return {
            success: true,
            output: data,
        };
    } catch (e) {
        return {
            success: false,
            output: null,
            error: `查询微生物特征失败: ${String(e)}`,
        };
    }
}
