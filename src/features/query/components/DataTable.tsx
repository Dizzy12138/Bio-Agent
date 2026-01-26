import React, { useState, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical, ExternalLink, Eye } from 'lucide-react';
import type { QueryResultItem, TableColumn, SortConfig, TableSelection } from '../types';
import './DataTable.css';

interface DataTableProps {
    data: QueryResultItem[];
    columns: TableColumn[];
    sort: SortConfig;
    selection: TableSelection;
    loading?: boolean;
    onSort: (field: string) => void;
    onSelectionChange: (selection: TableSelection) => void;
    onRowClick?: (item: QueryResultItem) => void;
    onPreview?: (item: QueryResultItem) => void;
}

/**
 * DataTable - 动态数据表格
 * 
 * 支持列排序、行选中、批量操作
 * 提供化学式缩略图预览和详情链接
 */
export const DataTable: React.FC<DataTableProps> = ({
    data,
    columns,
    sort,
    selection,
    loading = false,
    onSort,
    onSelectionChange,
    onRowClick,
    onPreview
}) => {
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [resizing, setResizing] = useState<string | null>(null);

    // 处理全选
    const handleSelectAll = useCallback(() => {
        if (selection.selectAll) {
            onSelectionChange({ selectedIds: new Set(), selectAll: false });
        } else {
            const allIds = new Set(data.map(item => item.id));
            onSelectionChange({ selectedIds: allIds, selectAll: true });
        }
    }, [data, selection.selectAll, onSelectionChange]);

    // 处理单行选中
    const handleSelectRow = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelectedIds = new Set(selection.selectedIds);
        if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
        } else {
            newSelectedIds.add(id);
        }
        onSelectionChange({
            selectedIds: newSelectedIds,
            selectAll: newSelectedIds.size === data.length
        });
    }, [data.length, selection.selectedIds, onSelectionChange]);

    // 获取排序图标
    const getSortIcon = (field: string) => {
        if (sort.field !== field) {
            return <ArrowUpDown size={14} className="sort-icon inactive" />;
        }
        return sort.direction === 'asc'
            ? <ArrowUp size={14} className="sort-icon active" />
            : <ArrowDown size={14} className="sort-icon active" />;
    };

    // 列宽调整处理
    const handleResizeStart = useCallback((columnId: string, e: React.MouseEvent) => {
        e.preventDefault();
        setResizing(columnId);

        const startX = e.clientX;
        const startWidth = columnWidths[columnId] || 150;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX;
            const newWidth = Math.max(80, startWidth + delta);
            setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
        };

        const handleMouseUp = () => {
            setResizing(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [columnWidths]);

    // 获取单元格值
    const getCellValue = (item: QueryResultItem, accessor: string): unknown => {
        const keys = accessor.split('.');
        let value: unknown = item;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = (value as Record<string, unknown>)[key];
            } else {
                return undefined;
            }
        }
        return value;
    };

    // 渲染单元格内容
    const renderCell = (item: QueryResultItem, column: TableColumn) => {
        const value = getCellValue(item, column.accessor);

        if (column.render) {
            return column.render(value, item);
        }

        // 处理特殊类型
        if (column.accessor === 'molecule' && item.molecule) {
            return (
                <div className="cell-molecule">
                    <span className="molecule-formula">{item.molecule.formula}</span>
                </div>
            );
        }

        if (typeof value === 'number') {
            return value.toLocaleString();
        }

        return String(value ?? '—');
    };

    // Loading 状态
    if (loading) {
        return (
            <div className="data-table__loading">
                <div className="data-table__skeleton">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton-row">
                            {columns.map((col, j) => (
                                <div key={j} className="skeleton-cell" style={{ width: col.width || 150 }} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Empty 状态
    if (data.length === 0) {
        return (
            <div className="data-table__empty">
                <div className="data-table__empty-icon">📭</div>
                <h3>暂无数据</h3>
                <p>调整筛选条件或扩大搜索范围</p>
            </div>
        );
    }

    return (
        <div className="data-table">
            <div className="data-table__container">
                <table className="data-table__table">
                    <thead>
                        <tr>
                            {/* 选择列 */}
                            <th className="data-table__th data-table__th--checkbox">
                                <label className="data-table__checkbox-wrapper">
                                    <input
                                        type="checkbox"
                                        checked={selection.selectAll}
                                        onChange={handleSelectAll}
                                    />
                                    <span className="data-table__checkbox" />
                                </label>
                            </th>

                            {/* 数据列 */}
                            {columns.map(column => (
                                <th
                                    key={column.id}
                                    className={`data-table__th ${column.sortable ? 'sortable' : ''}`}
                                    style={{ width: columnWidths[column.id] || column.width }}
                                >
                                    <div className="data-table__th-content">
                                        {column.sortable ? (
                                            <button
                                                className="data-table__sort-btn"
                                                onClick={() => onSort(column.accessor)}
                                            >
                                                {column.header}
                                                {getSortIcon(column.accessor)}
                                            </button>
                                        ) : (
                                            <span>{column.header}</span>
                                        )}

                                        {column.resizable && (
                                            <div
                                                className={`data-table__resize-handle ${resizing === column.id ? 'active' : ''}`}
                                                onMouseDown={(e) => handleResizeStart(column.id, e)}
                                            >
                                                <GripVertical size={12} />
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}

                            {/* 操作列 */}
                            <th className="data-table__th data-table__th--actions">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(item => (
                            <tr
                                key={item.id}
                                className={`data-table__tr ${selection.selectedIds.has(item.id) ? 'selected' : ''}`}
                                onClick={() => onRowClick?.(item)}
                            >
                                <td className="data-table__td data-table__td--checkbox">
                                    <label
                                        className="data-table__checkbox-wrapper"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selection.selectedIds.has(item.id)}
                                            onChange={(e) => handleSelectRow(item.id, e as unknown as React.MouseEvent)}
                                        />
                                        <span className="data-table__checkbox" />
                                    </label>
                                </td>

                                {columns.map(column => (
                                    <td
                                        key={column.id}
                                        className="data-table__td"
                                        style={{ width: columnWidths[column.id] || column.width }}
                                    >
                                        {renderCell(item, column)}
                                    </td>
                                ))}

                                <td className="data-table__td data-table__td--actions">
                                    <div className="data-table__actions">
                                        {onPreview && (
                                            <button
                                                className="data-table__action-btn"
                                                onClick={(e) => { e.stopPropagation(); onPreview(item); }}
                                                title="预览"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        )}
                                        <button
                                            className="data-table__action-btn"
                                            onClick={(e) => e.stopPropagation()}
                                            title="查看详情"
                                        >
                                            <ExternalLink size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
