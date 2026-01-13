import React, { useEffect } from 'react';
import { useKnowledgeStore } from '../stores/knowledgeStore';
import type { PromptTemplate } from '../api/knowledgeAPI';
import './PromptTemplates.css';

interface PromptTemplatesProps {
    categoryId: string | null;
    searchQuery: string;
    viewMode: 'grid' | 'list';
    onItemSelect: (item: PromptTemplate) => void;
    selectedItemId?: string;
}

// 分类颜色配置
const categoryColors: Record<string, { color: string; bg: string; icon: string }> = {
    'tpl-analysis': { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', icon: '📊' },
    'tpl-synthesis': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', icon: '🔄' },
    'tpl-query': { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)', icon: '🔍' },
};

// 格式化日期
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const PromptTemplates: React.FC<PromptTemplatesProps> = ({
    categoryId,
    searchQuery,
    viewMode,
    onItemSelect,
    selectedItemId,
}) => {
    const {
        templates,
        isLoadingTemplates,
        loadTemplates
    } = useKnowledgeStore();

    // 当分类或搜索词变化时触发加载
    useEffect(() => {
        loadTemplates({
            query: searchQuery,
            categoryId: categoryId || undefined,
        });
    }, [categoryId, searchQuery, loadTemplates]);

    if (isLoadingTemplates) {
        return (
            <div className={viewMode === 'grid' ? 'content-grid' : 'content-list'}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="loading-skeleton skeleton-card" />
                ))}
            </div>
        );
    }

    if (templates.length === 0) {
        return (
            <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <path d="M10 12l2 2 4-4" />
                </svg>
                <h3 className="empty-state-title">暂无模板</h3>
                <p className="empty-state-description">
                    {searchQuery ? '没有找到匹配的模板，请尝试其他搜索关键词' : '该分类下暂无模板数据'}
                </p>
            </div>
        );
    }

    return (
        <div className={viewMode === 'grid' ? 'content-grid' : 'content-list'}>
            {templates.map(template => (
                <TemplateCard
                    key={template.id}
                    template={template}
                    viewMode={viewMode}
                    isSelected={selectedItemId === template.id}
                    onClick={() => onItemSelect(template)}
                />
            ))}
        </div>
    );
};

interface TemplateCardProps {
    template: PromptTemplate;
    viewMode: 'grid' | 'list';
    isSelected: boolean;
    onClick: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, viewMode, isSelected, onClick }) => {
    const categoryStyle = categoryColors[template.category] || { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', icon: '📄' };

    if (viewMode === 'list') {
        return (
            <div
                className={`template-list-item ${isSelected ? 'selected' : ''}`}
                onClick={onClick}
            >
                <div
                    className="template-list-icon"
                    style={{ background: categoryStyle.bg, color: categoryStyle.color }}
                >
                    {categoryStyle.icon}
                </div>
                <div className="template-list-content">
                    <h4 className="template-list-title">
                        {template.name}
                        <span className="template-version">v{template.version}</span>
                    </h4>
                    <p className="template-list-description">{template.description}</p>
                </div>
                <div className="template-list-meta">
                    <span className="template-variables-count">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {template.variables.length} 变量
                    </span>
                    <span className="template-usage-count">
                        {template.usageCount} 次使用
                    </span>
                </div>
                <div className={`template-status ${template.isActive ? 'active' : 'inactive'}`}>
                    {template.isActive ? '启用' : '禁用'}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`template-card ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
        >
            <div className="template-card-header">
                <span
                    className="template-category-badge"
                    style={{ color: categoryStyle.color, background: categoryStyle.bg }}
                >
                    {categoryStyle.icon} {template.category === 'tpl-analysis' ? '分析类' :
                        template.category === 'tpl-synthesis' ? '合成类' : '查询类'}
                </span>
                <div className="template-header-right">
                    <span className="template-version">v{template.version}</span>
                    <div className={`template-status-dot ${template.isActive ? 'active' : 'inactive'}`} />
                </div>
            </div>

            <h3 className="template-card-title">{template.name}</h3>
            <p className="template-card-description">{template.description}</p>

            {/* 变量预览 */}
            <div className="template-variables">
                <span className="variables-label">变量:</span>
                <div className="variables-list">
                    {template.variables.slice(0, 4).map((variable, i) => (
                        <span key={i} className={`variable-tag ${variable.required ? 'required' : ''}`}>
                            {`{{${variable.name}}}`}
                        </span>
                    ))}
                    {template.variables.length > 4 && (
                        <span className="variable-tag more">+{template.variables.length - 4}</span>
                    )}
                </div>
            </div>

            {/* 模板预览 */}
            <div className="template-preview">
                <pre className="template-preview-code">
                    {template.template.slice(0, 150)}...
                </pre>
            </div>

            <div className="template-card-footer">
                <span className="template-usage">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                    </svg>
                    {template.usageCount} 次使用
                </span>
                <span className="template-updated">
                    更新于 {formatDate(template.updatedAt)}
                </span>
            </div>
        </div>
    );
};
