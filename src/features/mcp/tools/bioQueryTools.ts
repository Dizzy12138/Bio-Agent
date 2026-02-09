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

    // 添加详细日志
    console.log('[MCP Tool] query_delivery_systems called with:', input);

    try {
        const data = await bioextractAPI.getDeliverySystems(input);
        
        // 添加响应日志
        console.log('[MCP Tool] query_delivery_systems response:', {
            total: data.total,
            itemCount: data.items?.length,
            hasItems: data.items && data.items.length > 0
        });
        
        if (!data || data.total === 0 || (Array.isArray(data.items) && data.items.length === 0)) {
            console.log('[MCP Tool] No results found for:', input);
            return {
                success: true,
                output: '未找到符合条件的递送系统记录。请尝试更换关键词（例如使用 "nanoparticle" 或更通用的术语）。',
            };
        }
        
        const conciseItems = data.items.map((item: Record<string, any>) => ({
            name: item.name,
            type: item.subcategory,
            description: item.raw_data?.description || item.functional_performance?.functionality_notes || 'N/A',
            paper_ids: item.paper_ids || [],
            paper_titles: item.paper_titles || [],
            paper_count: item.paper_count ?? (item.paper_ids?.length || 0),
            functional_performance: item.functional_performance,
            biological_impact: item.biological_impact,
        }));
        
        console.log('[MCP Tool] Returning', conciseItems.length, 'processed items');
        
        return {
            success: true,
            output: conciseItems,
        };
    } catch (e) {
        // 增强错误信息
        const errorMessage = e instanceof Error ? e.message : String(e);
        const errorStack = e instanceof Error ? e.stack : undefined;
        
        console.error('[MCP Tool] query_delivery_systems failed:', {
            message: errorMessage,
            stack: errorStack,
            input: input
        });
        
        return {
            success: false,
            output: null,
            error: `查询递送系统失败: ${errorMessage}。请检查：1) 后端服务是否运行 2) 网络连接是否正常 3) API URL 配置是否正确`,
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

    // 添加详细日志
    console.log('[MCP Tool] query_micro_features called with:', input);

    try {
        const data = await bioextractAPI.getMicroFeatures(input);
        
        // 添加响应日志
        console.log('[MCP Tool] query_micro_features response:', {
            total: data.total,
            itemCount: data.items?.length,
            hasItems: data.items && data.items.length > 0
        });
        
        if (!data || data.total === 0 || (Array.isArray(data.items) && data.items.length === 0)) {
            console.log('[MCP Tool] No results found for:', input);
            return {
                success: true,
                output: "未找到符合条件的微生物记录。请尝试更换关键词（例如使用英文关键词 'oxygen' 或更通用的术语）。",
            };
        }
        
        const conciseItems = data.items.map((item: Record<string, any>) => ({
            name: item.name,
            category: item.subcategory,
            function: item.functional_performance?.functionality_notes || item.raw_data?.description || 'N/A',
            growth_notes: item.raw_data?.chassis_and_growth?.growth_conditions?.oxygen_notes,
            paper_ids: item.paper_ids || [],
            paper_titles: item.paper_titles || [],
            paper_count: item.paper_count ?? (item.paper_ids?.length || 0),
            functional_performance: item.functional_performance,
            biological_impact: item.biological_impact,
        }));
        
        console.log('[MCP Tool] Returning', conciseItems.length, 'processed items');
        
        return {
            success: true,
            output: conciseItems,
        };
    } catch (e) {
        // 增强错误信息
        const errorMessage = e instanceof Error ? e.message : String(e);
        const errorStack = e instanceof Error ? e.stack : undefined;
        
        console.error('[MCP Tool] query_micro_features failed:', {
            message: errorMessage,
            stack: errorStack,
            input: input
        });
        
        return {
            success: false,
            output: null,
            error: `查询微生物特征失败: ${errorMessage}。请检查：1) 后端服务是否运行 2) 网络连接是否正常 3) API URL 配置是否正确`,
        };
    }
}
