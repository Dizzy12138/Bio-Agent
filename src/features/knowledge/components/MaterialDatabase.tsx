import React, { useEffect, useState } from 'react';
import { useKnowledgeStore } from '../stores/knowledgeStore';
import type { Material } from '../api/knowledgeAPI';
import './MaterialDatabase.css';

interface MaterialDatabaseProps {
    categoryId: string | null;
    searchQuery: string;
    viewMode: 'grid' | 'list';
    onItemSelect: (item: Material) => void;
    selectedItemId?: string;
}

// 分类颜色配置
const categoryColors: Record<string, { color: string; bg: string; icon: string }> = {
    'mat-hydrogel': { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)', icon: '💧' },
    'mat-scaffold': { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', icon: '🏗️' },
    'mat-nanoparticle': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: '⚛️' },
};

// 格式化日期
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const MaterialDatabase: React.FC<MaterialDatabaseProps> = ({
    categoryId,
    searchQuery,
    viewMode,
    onItemSelect,
    selectedItemId,
}) => {
    const {
        materials,
        isLoadingMaterials,
        loadMaterials
    } = useKnowledgeStore();
    const [compareList, setCompareList] = useState<string[]>([]);

    // 当分类或搜索词变化时触发加载
    useEffect(() => {
        loadMaterials({
            query: searchQuery,
            categoryId: categoryId || undefined,
        });
    }, [categoryId, searchQuery, loadMaterials]);

    // 添加/移除对比
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
                    {searchQuery ? '没有找到匹配的材料，请尝试其他搜索关键词' : '该分类下暂无材料数据'}
                </p>
            </div>
        );
    }

    return (
        <>
            {/* 对比条 */}
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

            <div className={viewMode === 'grid' ? 'content-grid' : 'content-list'}>
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
        </>
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
    const categoryStyle = categoryColors[material.category] || { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', icon: '📦' };

    if (viewMode === 'list') {
        return (
            <div
                className={`material-list-item ${isSelected ? 'selected' : ''}`}
                onClick={onClick}
            >
                <div
                    className="material-list-icon"
                    style={{ background: categoryStyle.bg, color: categoryStyle.color }}
                >
                    {categoryStyle.icon}
                </div>
                <div className="material-list-content">
                    <h4 className="material-list-title">{material.name}</h4>
                    <p className="material-list-meta">
                        {material.subcategory} · {material.properties.length}个属性 · {material.sources.length}篇文献
                    </p>
                </div>
                <div className="material-list-properties">
                    {material.properties.slice(0, 2).map((prop, i) => (
                        <span key={i} className="property-mini">
                            {prop.name}: {prop.value}{prop.unit}
                        </span>
                    ))}
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
                <span
                    className="material-category-badge"
                    style={{ color: categoryStyle.color, background: categoryStyle.bg }}
                >
                    {categoryStyle.icon} {material.subcategory}
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

            <h3 className="material-card-title">{material.name}</h3>

            <div className="material-properties-grid">
                {material.properties.slice(0, 4).map((prop, i) => (
                    <div key={i} className="property-item">
                        <span className="property-label">{prop.name}</span>
                        <span className="property-value">
                            {prop.value}
                            {prop.unit && <span className="property-unit">{prop.unit}</span>}
                        </span>
                    </div>
                ))}
            </div>

            <div className="material-applications">
                <span className="applications-label">应用:</span>
                <div className="applications-tags">
                    {material.applications.slice(0, 3).map((app, i) => (
                        <span key={i} className="application-tag">{app}</span>
                    ))}
                </div>
            </div>

            <div className="material-card-footer">
                <span className="material-sources">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                    </svg>
                    {material.sources.length} 篇文献
                </span>
                <span className="material-updated">
                    更新于 {formatDate(material.updatedAt)}
                </span>
            </div>
        </div>
    );
};
