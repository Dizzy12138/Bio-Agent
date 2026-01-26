import React, { useState, useCallback, useMemo } from 'react';
import { FacetedSearch, DataTable, ActionBar } from './components';
import { PageHeader } from '../../components/PageHeader';
import type {
    QueryFilters,
    QueryResult,
    TableSelection,
    TableColumn,
    BatchAction,
    QueryResultItem
} from './types';
import './InteractiveQueryPage.css';

// ============================================
// Mock Data - 模拟数据（后续接入真实 API）
// ============================================

const mockFacets = [
    {
        id: 'type',
        title: '数据类型',
        icon: '📊',
        expanded: true,
        options: [
            { id: 'compound', label: '化合物', count: 2341, checked: false },
            { id: 'gene', label: '基因', count: 1567, checked: false },
            { id: 'protein', label: '蛋白质', count: 892, checked: false },
            { id: 'pathway', label: '代谢通路', count: 234, checked: false },
        ]
    },
    {
        id: 'source',
        title: '数据来源',
        icon: '🗄️',
        expanded: true,
        options: [
            { id: 'pubchem', label: 'PubChem', count: 1823, checked: false },
            { id: 'chembl', label: 'ChEMBL', count: 1456, checked: false },
            { id: 'drugbank', label: 'DrugBank', count: 678, checked: false },
            { id: 'kegg', label: 'KEGG', count: 543, checked: false },
            { id: 'uniprot', label: 'UniProt', count: 412, checked: false },
        ]
    },
    {
        id: 'species',
        title: '物种分类',
        icon: '🧬',
        expanded: false,
        options: [
            { id: 'human', label: 'Homo sapiens', count: 3245, checked: false },
            { id: 'mouse', label: 'Mus musculus', count: 1234, checked: false },
            { id: 'rat', label: 'Rattus norvegicus', count: 567, checked: false },
            { id: 'ecoli', label: 'E. coli', count: 432, checked: false },
        ]
    }
];

const mockRanges = [
    {
        id: 'molecularWeight',
        label: '分子量',
        min: 0,
        max: 1000,
        currentMin: 0,
        currentMax: 1000,
        unit: 'Da',
        step: 10
    },
    {
        id: 'year',
        label: '发表年份',
        min: 2000,
        max: 2026,
        currentMin: 2000,
        currentMax: 2026,
        unit: 'year',
        step: 1
    }
];

const generateMockData = (): QueryResultItem[] => {
    const types = ['compound', 'gene', 'protein', 'pathway'] as const;
    const sources = ['PubChem', 'ChEMBL', 'DrugBank', 'KEGG', 'UniProt'];
    const species = ['Homo sapiens', 'Mus musculus', 'Rattus norvegicus', 'E. coli'];

    return Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i + 1}`,
        name: `Sample ${types[i % types.length].charAt(0).toUpperCase() + types[i % types.length].slice(1)} ${i + 1}`,
        type: types[i % types.length],
        source: sources[i % sources.length],
        year: 2015 + (i % 12),
        species: species[i % species.length],
        molecularWeight: Math.round(100 + Math.random() * 800),
        molecule: i % 3 === 0 ? {
            smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
            formula: `C${8 + i % 10}H${6 + i % 8}O${2 + i % 4}`
        } : undefined,
        description: `这是一个示例${types[i % types.length]}条目的描述信息。`,
        metadata: {}
    }));
};

const defaultColumns: TableColumn[] = [
    { id: 'name', header: '名称', accessor: 'name', width: 200, sortable: true, resizable: true },
    { id: 'type', header: '类型', accessor: 'type', width: 100, sortable: true },
    { id: 'source', header: '来源', accessor: 'source', width: 120, sortable: true },
    { id: 'species', header: '物种', accessor: 'species', width: 150, sortable: true },
    { id: 'year', header: '年份', accessor: 'year', width: 80, sortable: true },
    { id: 'molecularWeight', header: '分子量', accessor: 'molecularWeight', width: 100, sortable: true },
    { id: 'molecule', header: '分子式', accessor: 'molecule', width: 120 },
];

// ============================================
// Component
// ============================================

/**
 * InteractiveQueryPage - 交互式查询主页面
 * 
 * 提供多维度筛选能力，实时更新结果列表
 * 支持批量操作和数据导出
 */
export const InteractiveQueryPage: React.FC = () => {
    // 筛选条件状态
    const [filters, setFilters] = useState<QueryFilters>({
        searchText: '',
        facets: mockFacets,
        ranges: mockRanges
    });

    // 查询结果状态
    const [result, setResult] = useState<QueryResult>({
        items: generateMockData(),
        pagination: { page: 1, pageSize: 20, total: 5034, totalPages: 252 },
        sort: { field: 'name', direction: 'asc' },
        loading: false,
        error: null
    });

    // 选中状态
    const [selection, setSelection] = useState<TableSelection>({
        selectedIds: new Set(),
        selectAll: false
    });

    // 筛选后的数据（模拟筛选逻辑）
    const filteredData = useMemo(() => {
        let data = result.items;

        // 文本搜索
        if (filters.searchText) {
            const search = filters.searchText.toLowerCase();
            data = data.filter(item =>
                item.name.toLowerCase().includes(search) ||
                item.description?.toLowerCase().includes(search)
            );
        }

        // 类型筛选
        const checkedTypes = filters.facets
            .find(f => f.id === 'type')?.options
            .filter(o => o.checked)
            .map(o => o.id) || [];

        if (checkedTypes.length > 0) {
            data = data.filter(item => checkedTypes.includes(item.type));
        }

        // 分子量范围
        const mwRange = filters.ranges.find(r => r.id === 'molecularWeight');
        if (mwRange) {
            data = data.filter(item =>
                !item.molecularWeight ||
                (item.molecularWeight >= mwRange.currentMin && item.molecularWeight <= mwRange.currentMax)
            );
        }

        // 年份范围
        const yearRange = filters.ranges.find(r => r.id === 'year');
        if (yearRange) {
            data = data.filter(item =>
                !item.year ||
                (item.year >= yearRange.currentMin && item.year <= yearRange.currentMax)
            );
        }

        // 排序
        const { field, direction } = result.sort;
        data = [...data].sort((a, b) => {
            const aVal = a[field as keyof QueryResultItem];
            const bVal = b[field as keyof QueryResultItem];
            if (aVal === bVal) return 0;
            if (aVal === undefined) return 1;
            if (bVal === undefined) return -1;
            const cmp = aVal < bVal ? -1 : 1;
            return direction === 'asc' ? cmp : -cmp;
        });

        return data;
    }, [result.items, result.sort, filters]);

    // 处理排序
    const handleSort = useCallback((field: string) => {
        setResult(prev => ({
            ...prev,
            sort: {
                field,
                direction: prev.sort.field === field && prev.sort.direction === 'asc' ? 'desc' : 'asc'
            }
        }));
    }, []);

    // 重置筛选条件
    const handleReset = useCallback(() => {
        setFilters({
            searchText: '',
            facets: mockFacets,
            ranges: mockRanges
        });
    }, []);

    // 处理批量操作
    const handleBatchAction = useCallback((action: BatchAction) => {
        const selectedItems = filteredData.filter(item => selection.selectedIds.has(item.id));
        console.log(`Batch action: ${action}`, selectedItems);

        // TODO: 实现具体操作逻辑
        alert(`执行操作: ${action}\n选中 ${selectedItems.length} 项`);
    }, [filteredData, selection.selectedIds]);

    // 处理行点击
    const handleRowClick = useCallback((item: QueryResultItem) => {
        console.log('Row clicked:', item);
    }, []);

    // 处理预览
    const handlePreview = useCallback((item: QueryResultItem) => {
        console.log('Preview:', item);
        alert(`预览: ${item.name}`);
    }, []);

    return (
        <div className="interactive-query-page">
            {/* 左侧筛选栏 */}
            <FacetedSearch
                filters={filters}
                resultCount={filteredData.length}
                loading={result.loading}
                onFiltersChange={setFilters}
                onReset={handleReset}
            />

            {/* 右侧内容区 */}
            <div className="interactive-query-page__content">
                {/* 页面头部 */}
                <PageHeader
                    icon="🔍"
                    title="交互式数据查询"
                    subtitle="多维度筛选与数据检索平台"
                />

                {/* 批量操作栏 */}
                <ActionBar
                    selection={selection}
                    onAction={handleBatchAction}
                />

                {/* 数据表格 */}
                <DataTable
                    data={filteredData}
                    columns={defaultColumns}
                    sort={result.sort}
                    selection={selection}
                    loading={result.loading}
                    onSort={handleSort}
                    onSelectionChange={setSelection}
                    onRowClick={handleRowClick}
                    onPreview={handlePreview}
                />

                {/* 分页信息 */}
                <footer className="interactive-query-page__footer">
                    <span className="interactive-query-page__pagination-info">
                        显示 {Math.min(filteredData.length, 20)} / {filteredData.length} 条
                    </span>
                </footer>
            </div>
        </div>
    );
};
