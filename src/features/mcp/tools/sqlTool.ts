/**
 * SQL MCP Tool Implementation
 * 
 * Provides SQL query execution capability.
 * Used by BioExtract Agent for database queries.
 */

import type { MCPToolParams, MCPToolResult } from '../types';

export interface SQLToolInput {
    sql: string;
    params?: unknown[];
}

export interface SQLToolOutput {
    rows: Record<string, unknown>[];
    rowCount: number;
    columns?: string[];
}

/**
 * Execute SQL tool
 * Uses the existing sqliteDatabase service.
 */
export async function executeSQLTool(
    params: MCPToolParams,
    config: Record<string, unknown>
): Promise<MCPToolResult> {
    const input = params.input as SQLToolInput;

    if (!input.sql) {
        return {
            success: false,
            output: null,
            error: 'Missing required input: sql',
        };
    }

    try {
        // Import the database service (default export is the singleton)
        const dbModule = await import('../../bioextract/api/sqliteDatabase');
        const db = dbModule.default;

        const timeout = config.timeout as number ?? 10000;

        // Execute with timeout
        const queryResult = await Promise.race([
            db.query(input.sql),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Query timeout')), timeout)
            ),
        ]);

        // Format output - convert from QueryResult format to rows
        const rows: Record<string, unknown>[] = queryResult.values.map(row => {
            const obj: Record<string, unknown> = {};
            queryResult.columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        });

        const output: SQLToolOutput = {
            rows,
            rowCount: queryResult.rowCount,
            columns: queryResult.columns,
        };

        return {
            success: true,
            output,
        };
    } catch (e) {
        return {
            success: false,
            output: null,
            error: `SQL execution failed: ${String(e)}`,
        };
    }
}
