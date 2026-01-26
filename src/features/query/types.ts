/**
 * Interactive Query Module - Type Definitions
 * 交互式查询模块的类型定义
 */

// ============================================
// Filter Types - 筛选条件类型
// ============================================

/** 筛选选项 */
export interface FacetOption {
    id: string;
    label: string;
    count: number;
    checked: boolean;
}

/** 筛选分组 */
export interface FacetGroup {
    id: string;
    title: string;
    icon?: string;
    options: FacetOption[];
    expanded: boolean;
}

/** 范围筛选 */
export interface RangeFilter {
    id: string;
    label: string;
    min: number;
    max: number;
    currentMin: number;
    currentMax: number;
    unit?: string;
    step?: number;
}

/** 查询筛选条件 */
export interface QueryFilters {
    searchText: string;
    facets: FacetGroup[];
    ranges: RangeFilter[];
}

// ============================================
// Result Types - 查询结果类型
// ============================================

/** 分子缩略图信息 */
export interface MoleculeThumbnail {
    smiles: string;
    formula: string;
    svgUrl?: string;
}

/** 查询结果项 */
export interface QueryResultItem {
    id: string;
    name: string;
    type: 'compound' | 'gene' | 'protein' | 'pathway' | 'organism';
    source: string;
    year?: number;
    species?: string;
    molecularWeight?: number;
    molecule?: MoleculeThumbnail;
    description?: string;
    metadata: Record<string, unknown>;
}

/** 分页信息 */
export interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

/** 排序配置 */
export interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

/** 查询结果集 */
export interface QueryResult {
    items: QueryResultItem[];
    pagination: Pagination;
    sort: SortConfig;
    loading: boolean;
    error: string | null;
}

// ============================================
// Table Types - 表格类型
// ============================================

/** 表格列定义 */
export interface TableColumn {
    id: string;
    header: string;
    accessor: string;
    width?: number;
    minWidth?: number;
    sortable?: boolean;
    resizable?: boolean;
    render?: (value: unknown, row: QueryResultItem) => React.ReactNode;
}

/** 表格选中状态 */
export interface TableSelection {
    selectedIds: Set<string>;
    selectAll: boolean;
}

// ============================================
// Action Types - 操作类型
// ============================================

/** 批量操作类型 */
export type BatchAction =
    | 'export_csv'
    | 'export_json'
    | 'send_to_analysis'
    | 'compare'
    | 'add_to_collection';

/** 操作按钮配置 */
export interface ActionButton {
    id: BatchAction;
    label: string;
    icon: string;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
}

// ============================================
// State Types - 状态类型
// ============================================

/** 查询模块状态 */
export interface QueryState {
    filters: QueryFilters;
    result: QueryResult;
    selection: TableSelection;
    viewMode: 'table' | 'grid' | 'compact';
}
