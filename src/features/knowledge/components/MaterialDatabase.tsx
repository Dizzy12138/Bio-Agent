import React, { useEffect, useState } from 'react';
import { useKnowledgeStore } from '../stores/knowledgeStore';
import type { Material } from '../api/knowledgeAPI';
import './MaterialDatabase.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MaterialDatabaseProps {
    categoryId: string | null;
    searchQuery: string;
    viewMode: 'grid' | 'list';
    onItemSelect: (item: Material) => void;
    selectedItemId?: string;
}

const PAGE_SIZE = 20;

// Subcategory display mapping
const subcategoryLabels: Record<string, string> = {
    'fiber': '纤维',
    'hydrogel': '水凝胶',
    'film': '薄膜',
    'nanoparticle': '纳米颗粒',
    'micelle': '胶束',
    'solution': '溶液',
    'other': '其他',
};

// Format date
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const MaterialDatabase: React.FC<MaterialDatabaseProps> = ({
    searchQuery,
    viewMode,
    onItemSelect,
    selectedItemId,
}) => {
    const {
        materials,
        materialsTotal,
        isLoadingMaterials,
        loadMaterials
    } = useKnowledgeStore();

    const [currentPage, setCurrentPage] = useState(1);
    const [compareList, setCompareList] = useState<string[]>([]);

    // 筛选状态
    const [category, setCategory] = useState<string>('');
    const [subcategory, setSubcategory] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('paper_count');
    const [sortOrder, setSortOrder] = useState<string>('desc');

    const totalPages = Math.ceil(materialsTotal / PAGE_SIZE);

    // 子分类选项
    const subcategoryOptions: Record<string, { value: string; label: string }[]> = {
        'delivery_system': [
            { value: '', label: '全部' },
            { value: 'delivery', label: '递送系统' },
            { value: 'theranostic', label: '诊疗一体' },
            { value: 'sensing', label: '传感' },
            { value: 'imaging', label: '成像' },
            { value: 'other', label: '其他' },
        ],
        'microbe': [
            { value: '', label: '全部' },
            { value: 'bacterium', label: '细菌' },
            { value: 'virus', label: '病毒' },
            { value: 'fungus', label: '真菌' },
            { value: 'microalgae', label: '微藻' },
            { value: 'other', label: '其他' },
        ],
    };

    // Load materials when filters change
    useEffect(() => {
        loadMaterials({
            query: searchQuery,
            category: category || undefined,
            subcategory: subcategory || undefined,
            sortBy,
            sortOrder,
            page: currentPage,
            pageSize: PAGE_SIZE,
        });
    }, [currentPage, searchQuery, category, subcategory, sortBy, sortOrder, loadMaterials]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, category, subcategory, sortBy, sortOrder]);

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    // Toggle compare
    const toggleCompare = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCompareList(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : prev.length < 4 ? [...prev, id] : prev
        );
    };

    if (isLoadingMaterials) {
        return (
            <div className={viewMode === 'grid' ? 'content-grid' : 'content-list'}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="loading-skeleton skeleton-card" />
                ))}
            </div>
        );
    }

    if (materials.length === 0) {
        return (
            <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                </svg>
                <h3 className="empty-state-title">暂无材料数据</h3>
                <p className="empty-state-description">
                    {searchQuery ? '没有找到匹配的材料，请尝试其他搜索关键词' : '暂无材料数据'}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Filter Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
                {/* 分类筛选 */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">分类:</label>
                    <select
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setSubcategory(''); }}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">全部</option>
                        <option value="delivery_system">递送系统</option>
                        <option value="microbe">微生物</option>
                    </select>
                </div>

                {/* 子分类筛选 */}
                {category && subcategoryOptions[category] && (
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">子类:</label>
                        <select
                            value={subcategory}
                            onChange={(e) => setSubcategory(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {subcategoryOptions[category].map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* 分隔线 */}
                <div className="h-6 w-px bg-gray-300" />

                {/* 排序 */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">排序:</label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="paper_count">关联文献数</option>
                        <option value="name">名称</option>
                        <option value="category">分类</option>
                        <option value="subcategory">子分类</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title={sortOrder === 'asc' ? '升序' : '降序'}
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
            </div>

            {/* Compare Bar */}
            {compareList.length > 0 && (
                <div className="compare-bar">
                    <div className="compare-bar-items">
                        {compareList.map(id => {
                            const mat = materials.find(m => m.id === id);
                            return mat ? (
                                <div key={id} className="compare-bar-item">
                                    <span>{mat.name}</span>
                                    <button
                                        className="compare-bar-remove"
                                        onClick={(e) => toggleCompare(id, e)}
                                    >×</button>
                                </div>
                            ) : null;
                        })}
                    </div>
                    <button className="compare-bar-btn">
                        对比 ({compareList.length})
                    </button>
                </div>
            )}

            {/* Material List */}
            <div className={`flex-1 overflow-y-auto ${viewMode === 'grid' ? 'content-grid' : 'content-list'}`}>
                {materials.map(material => (
                    <MaterialCard
                        key={material.id}
                        material={material}
                        viewMode={viewMode}
                        isSelected={selectedItemId === material.id}
                        isComparing={compareList.includes(material.id)}
                        onClick={() => onItemSelect(material)}
                        onToggleCompare={(e) => toggleCompare(material.id, e)}
                    />
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                    <div className="text-sm text-gray-500">
                        共 {materialsTotal} 种材料，第 {currentPage}/{totalPages} 页
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                            上一页
                        </button>
                        <span className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-600 rounded-md">
                            {currentPage}
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            下一页
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface MaterialCardProps {
    material: Material;
    viewMode: 'grid' | 'list';
    isSelected: boolean;
    isComparing: boolean;
    onClick: () => void;
    onToggleCompare: (e: React.MouseEvent) => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({
    material,
    viewMode,
    isSelected,
    isComparing,
    onClick,
    onToggleCompare,
}) => {
    const subcategoryLabel = subcategoryLabels[material.subcategory || ''] || material.subcategory;
    const functionalRole = material.functional_role || '未分类';
    const paperCount = material.paper_count || 0;
    const applications = material.applications || [];
    const properties = material.properties || [];

    if (viewMode === 'list') {
        return (
            <div
                className={`material-list-item ${isSelected ? 'selected' : ''}`}
                onClick={onClick}
            >
                <div className="material-list-icon">
                    🧪
                </div>
                <div className="material-list-content">
                    <h4 className="material-list-title">
                        {material.name}
                        {material.abbreviation && (
                            <span className="ml-2 text-gray-400 font-normal">({material.abbreviation})</span>
                        )}
                    </h4>
                    <p className="material-list-meta">
                        {subcategoryLabel && <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600 mr-2">{subcategoryLabel}</span>}
                        {functionalRole && <span className="inline-block px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-600 mr-2">{functionalRole}</span>}
                        <span className="text-gray-500">{paperCount} 篇文献</span>
                    </p>
                    {/* Display applications */}
                    {applications.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {applications.slice(0, 3).map((app, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 bg-green-50 text-green-600 rounded">{app}</span>
                            ))}
                            {applications.length > 3 && (
                                <span className="text-xs text-gray-400">+{applications.length - 3}</span>
                            )}
                        </div>
                    )}
                </div>
                <button
                    className={`compare-toggle ${isComparing ? 'active' : ''}`}
                    onClick={onToggleCompare}
                    title="添加到对比"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <div
            className={`material-card ${isSelected ? 'selected' : ''} ${isComparing ? 'comparing' : ''}`}
            onClick={onClick}
        >
            <div className="material-card-header">
                <span className="material-category-badge">
                    🧪 {subcategoryLabel || '材料'}
                </span>
                <button
                    className={`compare-toggle ${isComparing ? 'active' : ''}`}
                    onClick={onToggleCompare}
                    title="添加到对比"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                    </svg>
                </button>
            </div>

            <h3 className="material-card-title">
                {material.name}
                {material.abbreviation && (
                    <span className="text-sm text-gray-400 font-normal ml-2">({material.abbreviation})</span>
                )}
            </h3>

            {/* Functional role and category */}
            <div className="flex flex-wrap gap-1 mb-2">
                {functionalRole && (
                    <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded">{functionalRole}</span>
                )}
                {material.category && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">{material.category}</span>
                )}
            </div>

            {/* Properties display */}
            {properties.length > 0 && (
                <div className="material-properties-grid">
                    {properties.slice(0, 4).map((prop, i) => (
                        <div key={i} className="property-item">
                            <span className="property-label">{prop.name}</span>
                            <span className="property-value">
                                {prop.value}
                                {prop.unit && <span className="property-unit">{prop.unit}</span>}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Applications */}
            <div className="material-applications">
                <span className="applications-label">应用:</span>
                <div className="applications-tags">
                    {applications.slice(0, 3).map((app, i) => (
                        <span key={i} className="application-tag">{app}</span>
                    ))}
                    {applications.length > 3 && (
                        <span className="application-tag more">+{applications.length - 3}</span>
                    )}
                </div>
            </div>

            <div className="material-card-footer">
                <span className="material-sources">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                    </svg>
                    {paperCount} 篇文献
                </span>
                <span className="material-updated">
                    更新于 {formatDate(material.updatedAt)}
                </span>
            </div>
        </div>
    );
};
