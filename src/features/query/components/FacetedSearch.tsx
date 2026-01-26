import React, { useState, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { RangeSlider } from './RangeSlider';
import type { QueryFilters } from '../types';
import './FacetedSearch.css';

interface FacetedSearchProps {
    filters: QueryFilters;
    resultCount: number;
    loading?: boolean;
    onFiltersChange: (filters: QueryFilters) => void;
    onReset: () => void;
}

/**
 * FacetedSearch - 多面搜索组件
 * 
 * 提供文本搜索、复选框分组筛选、范围滑块等多维度筛选能力
 * 实时显示当前筛选条件下的结果数量
 */
export const FacetedSearch: React.FC<FacetedSearchProps> = ({
    filters,
    resultCount,
    loading = false,
    onFiltersChange,
    onReset
}) => {
    const [searchText, setSearchText] = useState(filters.searchText);

    // 处理搜索文本变化
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setSearchText(text);
        onFiltersChange({ ...filters, searchText: text });
    }, [filters, onFiltersChange]);

    // 切换分组展开/折叠
    const toggleGroupExpand = useCallback((groupId: string) => {
        const updatedFacets = filters.facets.map(group =>
            group.id === groupId ? { ...group, expanded: !group.expanded } : group
        );
        onFiltersChange({ ...filters, facets: updatedFacets });
    }, [filters, onFiltersChange]);

    // 切换选项选中状态
    const toggleOption = useCallback((groupId: string, optionId: string) => {
        const updatedFacets = filters.facets.map(group => {
            if (group.id !== groupId) return group;
            return {
                ...group,
                options: group.options.map(opt =>
                    opt.id === optionId ? { ...opt, checked: !opt.checked } : opt
                )
            };
        });
        onFiltersChange({ ...filters, facets: updatedFacets });
    }, [filters, onFiltersChange]);

    // 处理范围变化
    const handleRangeChange = useCallback((rangeId: string, min: number, max: number) => {
        const updatedRanges = filters.ranges.map(range =>
            range.id === rangeId ? { ...range, currentMin: min, currentMax: max } : range
        );
        onFiltersChange({ ...filters, ranges: updatedRanges });
    }, [filters, onFiltersChange]);

    // 计算已激活筛选条件数量
    const activeFilterCount =
        filters.facets.reduce((acc, group) =>
            acc + group.options.filter(opt => opt.checked).length, 0
        ) +
        filters.ranges.filter(range =>
            range.currentMin !== range.min || range.currentMax !== range.max
        ).length +
        (filters.searchText ? 1 : 0);

    return (
        <aside className="faceted-search">
            {/* 头部 - 结果统计 */}
            <div className="faceted-search__header">
                <div className="faceted-search__stats">
                    <span className="faceted-search__count">
                        {loading ? (
                            <span className="faceted-search__loading">搜索中...</span>
                        ) : (
                            <>
                                <strong>{resultCount.toLocaleString()}</strong> 条结果
                            </>
                        )}
                    </span>
                    {activeFilterCount > 0 && (
                        <span className="faceted-search__active-filters">
                            {activeFilterCount} 个筛选条件
                        </span>
                    )}
                </div>
                {activeFilterCount > 0 && (
                    <button
                        className="faceted-search__reset"
                        onClick={onReset}
                        title="重置所有筛选条件"
                    >
                        <RotateCcw size={14} />
                        重置
                    </button>
                )}
            </div>

            {/* 搜索框 */}
            <div className="faceted-search__search">
                <Search size={18} className="faceted-search__search-icon" />
                <input
                    type="text"
                    className="faceted-search__search-input"
                    placeholder="搜索名称、描述..."
                    value={searchText}
                    onChange={handleSearchChange}
                />
            </div>

            {/* 范围筛选器 */}
            {filters.ranges.length > 0 && (
                <div className="faceted-search__section">
                    <h4 className="faceted-search__section-title">数值范围</h4>
                    {filters.ranges.map(range => (
                        <RangeSlider
                            key={range.id}
                            filter={range}
                            onChange={(min, max) => handleRangeChange(range.id, min, max)}
                        />
                    ))}
                </div>
            )}

            {/* 分组筛选 */}
            {filters.facets.map(group => (
                <div key={group.id} className="faceted-search__group">
                    <button
                        className="faceted-search__group-header"
                        onClick={() => toggleGroupExpand(group.id)}
                    >
                        <span className="faceted-search__group-title">
                            {group.icon && <span className="faceted-search__group-icon">{group.icon}</span>}
                            {group.title}
                        </span>
                        <span className="faceted-search__group-toggle">
                            {group.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                    </button>

                    {group.expanded && (
                        <div className="faceted-search__options">
                            {group.options.map(option => (
                                <label
                                    key={option.id}
                                    className={`faceted-search__option ${option.checked ? 'checked' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={option.checked}
                                        onChange={() => toggleOption(group.id, option.id)}
                                    />
                                    <span className="faceted-search__checkbox" />
                                    <span className="faceted-search__option-label">{option.label}</span>
                                    <span className="faceted-search__option-count">{option.count}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </aside>
    );
};
