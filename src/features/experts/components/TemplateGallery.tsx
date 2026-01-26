import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Star, Zap, ChevronRight } from 'lucide-react';
import {
    EXPERT_TEMPLATES,
    TEMPLATE_CATEGORIES,
    getPopularTemplates,
    searchTemplates,
    createExpertFromTemplate,
    type ExpertTemplate,
    type TemplateCategory
} from '../templates';
import type { Expert } from '../types';
import './TemplateGallery.css';

interface TemplateGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (expert: Omit<Expert, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
    isOpen,
    onClose,
    onSelectTemplate,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
    const [previewTemplate, setPreviewTemplate] = useState<ExpertTemplate | null>(null);

    // 过滤模板
    const filteredTemplates = useMemo(() => {
        let templates = EXPERT_TEMPLATES;

        // 按搜索词过滤
        if (searchQuery) {
            templates = searchTemplates(searchQuery);
        }

        // 按类别过滤
        if (selectedCategory !== 'all') {
            templates = templates.filter(t => t.category === selectedCategory);
        }

        return templates;
    }, [searchQuery, selectedCategory]);

    // 热门模板
    const popularTemplates = useMemo(() => getPopularTemplates(4), []);

    const handleUseTemplate = (template: ExpertTemplate) => {
        const expertData = createExpertFromTemplate(template);
        onSelectTemplate(expertData);
        onClose();
    };

    const modalContent = (
        <div className="template-gallery-overlay" onClick={onClose}>
            <div className="template-gallery-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <header className="gallery-header">
                    <div className="gallery-title-area">
                        <h2 className="gallery-title">
                            <Zap size={24} />
                            专家模板库
                        </h2>
                        <p className="gallery-subtitle">从预设模板快速创建专家，或作为自定义专家的起点</p>
                    </div>
                    <button className="gallery-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                {/* Search and Filters */}
                <div className="gallery-filters">
                    <div className="gallery-search">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="搜索模板..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="gallery-categories">
                        <button
                            className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('all')}
                        >
                            全部
                        </button>
                        {TEMPLATE_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="gallery-content">
                    {/* Popular Section (only show when no filters) */}
                    {!searchQuery && selectedCategory === 'all' && (
                        <section className="gallery-section">
                            <h3 className="section-title">
                                <Star size={16} />
                                热门模板
                            </h3>
                            <div className="template-grid popular">
                                {popularTemplates.map(template => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onPreview={() => setPreviewTemplate(template)}
                                        onUse={() => handleUseTemplate(template)}
                                        isPopular
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* All Templates */}
                    <section className="gallery-section">
                        <h3 className="section-title">
                            {searchQuery ? `搜索结果 (${filteredTemplates.length})` :
                                selectedCategory !== 'all' ?
                                    TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.name :
                                    '全部模板'}
                        </h3>
                        {filteredTemplates.length === 0 ? (
                            <div className="gallery-empty">
                                <p>没有找到匹配的模板</p>
                            </div>
                        ) : (
                            <div className="template-grid">
                                {filteredTemplates.map(template => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onPreview={() => setPreviewTemplate(template)}
                                        onUse={() => handleUseTemplate(template)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Preview Panel */}
                {previewTemplate && (
                    <TemplatePreview
                        template={previewTemplate}
                        onClose={() => setPreviewTemplate(null)}
                        onUse={() => handleUseTemplate(previewTemplate)}
                    />
                )}
            </div>
        </div>
    );

    return isOpen ? createPortal(modalContent, document.body) : null;
};

// Template Card Component
interface TemplateCardProps {
    template: ExpertTemplate;
    onPreview: () => void;
    onUse: () => void;
    isPopular?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onPreview, onUse, isPopular }) => {
    const category = TEMPLATE_CATEGORIES.find(c => c.id === template.category);

    return (
        <div className={`template-card ${isPopular ? 'popular' : ''}`}>
            <div className="template-card-header">
                <div className="template-avatar">{template.avatar}</div>
                <div className="template-meta">
                    <span className="template-category">
                        {category?.icon} {category?.name}
                    </span>
                    {isPopular && (
                        <span className="template-popular-badge">
                            <Star size={10} /> 热门
                        </span>
                    )}
                </div>
            </div>
            <h4 className="template-name">{template.name}</h4>
            <p className="template-description">{template.description}</p>
            <div className="template-tags">
                {template.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="template-tag">{tag}</span>
                ))}
            </div>
            <div className="template-actions">
                <button className="template-preview-btn" onClick={onPreview}>
                    预览
                </button>
                <button className="template-use-btn" onClick={onUse}>
                    使用模板
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

// Template Preview Panel
interface TemplatePreviewProps {
    template: ExpertTemplate;
    onClose: () => void;
    onUse: () => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, onClose, onUse }) => {
    const category = TEMPLATE_CATEGORIES.find(c => c.id === template.category);

    return (
        <div className="template-preview-panel">
            <header className="preview-header">
                <h3>模板预览</h3>
                <button className="preview-close-btn" onClick={onClose}>
                    <X size={18} />
                </button>
            </header>

            <div className="preview-content">
                {/* Basic Info */}
                <div className="preview-hero">
                    <div className="preview-avatar">{template.avatar}</div>
                    <div className="preview-info">
                        <h4 className="preview-name">{template.name}</h4>
                        <span className="preview-category">
                            {category?.icon} {category?.name}
                        </span>
                    </div>
                </div>

                <p className="preview-description">{template.description}</p>

                {/* Capabilities */}
                <div className="preview-section">
                    <h5>专业能力</h5>
                    <div className="preview-chips">
                        {template.capabilities.map(cap => (
                            <span key={cap} className="preview-chip">{cap}</span>
                        ))}
                    </div>
                </div>

                {/* Tools */}
                <div className="preview-section">
                    <h5>可用工具</h5>
                    <div className="preview-chips">
                        {template.tools.map(tool => (
                            <span key={tool} className="preview-chip tool">
                                {tool === 'knowledge-search' && '📚 知识库检索'}
                                {tool === 'literature-search' && '📄 文献检索'}
                                {tool === 'data-analysis' && '📊 数据分析'}
                                {tool === 'chart-generator' && '📈 图表生成'}
                                {tool === 'image-analysis' && '🖼️ 图像分析'}
                            </span>
                        ))}
                    </div>
                </div>

                {/* System Prompt */}
                <div className="preview-section">
                    <h5>系统提示词</h5>
                    <pre className="preview-prompt">{template.systemPrompt}</pre>
                </div>

                {/* Tags */}
                <div className="preview-section">
                    <h5>标签</h5>
                    <div className="preview-tags">
                        {template.tags.map(tag => (
                            <span key={tag} className="preview-tag">#{tag}</span>
                        ))}
                    </div>
                </div>
            </div>

            <footer className="preview-footer">
                <button className="btn btn-outline" onClick={onClose}>取消</button>
                <button className="btn btn-primary" onClick={onUse}>
                    使用此模板
                </button>
            </footer>
        </div>
    );
};
