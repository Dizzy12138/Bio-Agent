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
        if (!data || data.total === 0 || (Array.isArray(data.items) && data.items.length === 0)) {
            return {
                success: true,
                output: '未找到符合条件的递送系统记录。请尝试更换关键词。',
            };
        }
        const conciseItems = data.items.map((item: Record<string, any>) => ({
            name: item.name,
            type: item.subcategory,
            description: item.raw_data?.description || item.functional_performance?.functionality_notes || 'N/A',
            paper_id: item.paper_id,
        }));
        return {
            success: true,
            output: conciseItems,
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
        if (!data || data.total === 0 || (Array.isArray(data.items) && data.items.length === 0)) {
            return {
                success: true,
                output: '未找到符合条件的微生物记录。请尝试更换关键词。',
            };
        }
        const conciseItems = data.items.map((item: Record<string, any>) => ({
            name: item.name,
            type: item.subcategory,
            function: item.functional_performance?.functionality_notes || item.raw_data?.description || 'N/A',
            paper_id: item.paper_id,
        }));
        return {
            success: true,
            output: conciseItems,
        };
    } catch (e) {
        return {
            success: false,
            output: null,
            error: `查询微生物特征失败: ${String(e)}`,
        };
    }
}
