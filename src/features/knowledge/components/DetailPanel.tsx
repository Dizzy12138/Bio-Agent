import React from 'react';
import type { Document, Material, PromptTemplate, KnowledgeViewType } from '../types';
import './DetailPanel.css';

interface DetailPanelProps {
    item: Document | Material | PromptTemplate | null;
    type: KnowledgeViewType;
    onClose: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ item, type, onClose }) => {
    if (!item) {
        return (
            <aside className="detail-panel hidden">
                {/* Empty state */}
            </aside>
        );
    }

    const renderContent = () => {
        switch (type) {
            case 'documents':
                return <DocumentDetail document={item as Document} />;
            case 'materials':
                return <MaterialDetail material={item as Material} />;
            case 'templates':
                return <TemplateDetail template={item as PromptTemplate} />;
            default:
                return null;
        }
    };

    return (
        <aside className="detail-panel">
            <header className="detail-header">
                <div className="detail-header-content">
                    <h2 className="detail-title">
                        {type === 'documents' && (item as Document).title}
                        {type === 'materials' && (item as Material).name}
                        {type === 'templates' && (item as PromptTemplate).name}
                    </h2>
                    <p className="detail-subtitle">
                        {type === 'documents' && '文献详情'}
                        {type === 'materials' && '材料详情'}
                        {type === 'templates' && '模板详情'}
                    </p>
                </div>
                <button className="detail-close-btn" onClick={onClose}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </header>

            <div className="detail-body">
                {renderContent()}
            </div>

            <footer className="detail-footer">
                {type === 'documents' && (
                    <>
                        <button className="btn btn-outline">查看全文</button>
                        <button className="btn btn-primary">添加到工作流</button>
                    </>
                )}
                {type === 'materials' && (
                    <>
                        <button className="btn btn-outline">对比分析</button>
                        <button className="btn btn-primary">使用此材料</button>
                    </>
                )}
                {type === 'templates' && (
                    <>
                        <button className="btn btn-outline">编辑模板</button>
                        <button className="btn btn-primary">立即使用</button>
                    </>
                )}
            </footer>
        </aside>
    );
};

// 文献详情
const DocumentDetail: React.FC<{ document: Document }> = ({ document }) => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <>
            {/* 基本信息 */}
            <section className="detail-section">
                <h3 className="detail-section-title">基本信息</h3>
                <div className="detail-info-grid">
                    <div className="info-item">
                        <span className="info-label">作者</span>
                        <span className="info-value">{(document.authors || []).join(', ')}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">来源</span>
                        <span className="info-value highlight">{document.source}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">发表日期</span>
                        <span className="info-value">{document.publishDate ? formatDate(document.publishDate) : '-'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">DOI</span>
                        <a href={`https://doi.org/${document.doi}`} className="info-value link" target="_blank" rel="noopener noreferrer">
                            {document.doi}
                        </a>
                    </div>
                    <div className="info-item">
                        <span className="info-label">引用次数</span>
                        <span className="info-value">{document.citations || 0}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">文件大小</span>
                        <span className="info-value">{document.fileSize ? formatFileSize(document.fileSize) : '-'}</span>
                    </div>
                </div>
            </section>

            {/* 摘要 */}
            <section className="detail-section">
                <h3 className="detail-section-title">摘要</h3>
                <p className="detail-abstract">{document.abstract}</p>
            </section>

            {/* 关键词 */}
            <section className="detail-section">
                <h3 className="detail-section-title">关键词</h3>
                <div className="detail-tags">
                    {(document.keywords || []).map((keyword, i) => (
                        <span key={i} className="detail-tag">{keyword}</span>
                    ))}
                </div>
            </section>

            {/* 提取的特征 */}
            {document.features && document.features.length > 0 && (
                <section className="detail-section">
                    <h3 className="detail-section-title">结构化特征</h3>
                    <div className="feature-list">
                        {document.features.map(feature => (
                            <div key={feature.id} className="feature-item">
                                <div className="feature-header">
                                    <span className={`feature-type ${feature.type}`}>{feature.label}</span>
                                    <span className="feature-confidence">
                                        置信度: {Math.round(feature.confidence * 100)}%
                                    </span>
                                </div>
                                <p className="feature-value">{feature.value}</p>
                                <p className="feature-source">来源: {feature.source}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 处理状态 */}
            <section className="detail-section">
                <h3 className="detail-section-title">处理状态</h3>
                <div className="status-timeline">
                    <div className="timeline-item completed">
                        <div className="timeline-icon">✓</div>
                        <div className="timeline-content">
                            <span className="timeline-label">文件上传</span>
                            <span className="timeline-time">{document.uploadedAt ? formatDate(document.uploadedAt) : '-'}</span>
                        </div>
                    </div>
                    <div className={`timeline-item ${document.parsedAt ? 'completed' : document.status === 'parsing' ? 'active' : 'pending'}`}>
                        <div className="timeline-icon">{document.parsedAt ? '✓' : document.status === 'parsing' ? '⋯' : '○'}</div>
                        <div className="timeline-content">
                            <span className="timeline-label">内容解析</span>
                            {document.parsedAt && <span className="timeline-time">{formatDate(document.parsedAt)}</span>}
                        </div>
                    </div>
                    <div className={`timeline-item ${document.status === 'indexed' ? 'completed' : 'pending'}`}>
                        <div className="timeline-icon">{document.status === 'indexed' ? '✓' : '○'}</div>
                        <div className="timeline-content">
                            <span className="timeline-label">向量索引</span>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

// 材料详情
const MaterialDetail: React.FC<{ material: Material }> = ({ material }) => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <>
            {/* 基本信息 */}
            <section className="detail-section">
                <h3 className="detail-section-title">基本信息</h3>
                <div className="detail-info-grid">
                    <div className="info-item">
                        <span className="info-label">分类</span>
                        <span className="info-value">{material.subcategory}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">更新时间</span>
                        <span className="info-value">{formatDate(material.updatedAt)}</span>
                    </div>
                    <div className="info-item full-width">
                        <span className="info-label">来源文献</span>
                        <span className="info-value">{material.sources.length} 篇</span>
                    </div>
                </div>
            </section>

            {/* 材料属性 */}
            <section className="detail-section">
                <h3 className="detail-section-title">材料属性</h3>
                <div className="properties-table">
                    <div className="properties-header">
                        <span>属性名称</span>
                        <span>数值</span>
                        <span>单位</span>
                    </div>
                    {material.properties.map((prop, i) => (
                        <div key={i} className="properties-row">
                            <span className="prop-name">{prop.name}</span>
                            <span className="prop-value">{prop.value}</span>
                            <span className="prop-unit">{prop.unit || '-'}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* 应用场景 */}
            <section className="detail-section">
                <h3 className="detail-section-title">应用场景</h3>
                <div className="detail-tags">
                    {material.applications.map((app, i) => (
                        <span key={i} className="detail-tag accent">{app}</span>
                    ))}
                </div>
            </section>

            {/* 相关文献 */}
            <section className="detail-section">
                <h3 className="detail-section-title">相关文献</h3>
                <div className="related-sources">
                    {material.sources.map((sourceId, i) => (
                        <div key={i} className="source-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14,2 14,8 20,8" />
                            </svg>
                            <span>文献 {sourceId}</span>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
};

// 模板详情
const TemplateDetail: React.FC<{ template: PromptTemplate }> = ({ template }) => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'text': return '文本';
            case 'select': return '选择';
            case 'number': return '数字';
            case 'boolean': return '布尔';
            case 'json': return 'JSON';
            default: return type;
        }
    };

    return (
        <>
            {/* 基本信息 */}
            <section className="detail-section">
                <h3 className="detail-section-title">基本信息</h3>
                <div className="detail-info-grid">
                    <div className="info-item">
                        <span className="info-label">版本</span>
                        <span className="info-value">v{template.version}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">使用次数</span>
                        <span className="info-value highlight">{template.usageCount}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">创建时间</span>
                        <span className="info-value">{formatDate(template.createdAt)}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">更新时间</span>
                        <span className="info-value">{formatDate(template.updatedAt)}</span>
                    </div>
                    <div className="info-item full-width">
                        <span className="info-label">状态</span>
                        <span className={`info-value status ${template.isActive ? 'active' : 'inactive'}`}>
                            {template.isActive ? '已启用' : '已禁用'}
                        </span>
                    </div>
                </div>
            </section>

            {/* 描述 */}
            <section className="detail-section">
                <h3 className="detail-section-title">描述</h3>
                <p className="detail-abstract">{template.description}</p>
            </section>

            {/* 变量定义 */}
            <section className="detail-section">
                <h3 className="detail-section-title">变量定义</h3>
                <div className="variables-table">
                    {template.variables.map((variable, i) => (
                        <div key={i} className="variable-row">
                            <div className="variable-row-header">
                                <code className="variable-name">{`{{${variable.name}}}`}</code>
                                <span className={`variable-badge ${variable.required ? 'required' : 'optional'}`}>
                                    {variable.required ? '必填' : '选填'}
                                </span>
                                <span className="variable-type">{getTypeLabel(variable.type)}</span>
                            </div>
                            <p className="variable-description">{variable.description}</p>
                            {variable.options && (
                                <div className="variable-options">
                                    选项: {variable.options.join(' | ')}
                                </div>
                            )}
                            {variable.defaultValue && (
                                <div className="variable-default">
                                    默认值: {variable.defaultValue}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* 模板内容 */}
            <section className="detail-section">
                <h3 className="detail-section-title">模板内容</h3>
                <div className="template-content-preview">
                    <pre>{template.template}</pre>
                </div>
            </section>
        </>
    );
};
