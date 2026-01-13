import React from 'react';
import { Download } from 'lucide-react';
import type { Expert } from '../types';

interface ExpertDetailProps {
    expert: Expert;
    onEdit: (expert: Expert) => void;
    onDelete: (expertId: string) => void;
    onStartChat: (expert: Expert) => void;
    onExport: (expert: Expert) => void;
}

export const ExpertDetail: React.FC<ExpertDetailProps> = ({
    expert,
    onEdit,
    onDelete,
    onStartChat,
    onExport,
}) => {
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="expert-detail">
            {/* Header */}
            <div className="expert-detail-header">
                <div className="expert-detail-avatar">{expert.avatar}</div>
                <div className="expert-detail-info">
                    <h2 className="expert-detail-name">
                        {expert.name}
                        <span className={`expert-badge ${expert.isSystem ? 'system' : 'custom'}`}>
                            {expert.isSystem ? '系统专家' : '自定义专家'}
                        </span>
                    </h2>
                    <div className="expert-detail-domain">{expert.domain}</div>
                    <p className="expert-detail-description">{expert.description}</p>
                </div>
                <div className="expert-detail-actions">
                    <button className="btn btn-primary" onClick={() => onStartChat(expert)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        开始对话
                    </button>
                    <button className="btn btn-outline" onClick={() => onExport(expert)}>
                        <Download size={16} />
                        导出
                    </button>
                    {!expert.isSystem && (
                        <>
                            <button className="btn btn-outline" onClick={() => onEdit(expert)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                编辑
                            </button>
                            <button className="btn btn-outline" style={{ color: 'var(--error-500)' }} onClick={() => onDelete(expert.id)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                    <polyline points="3,6 5,6 21,6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                删除
                            </button>
                        </>
                    )}
                </div>
            </div>


            {/* Body */}
            <div className="expert-detail-body">
                {/* Stats */}
                <div className="detail-section">
                    <div className="detail-stats">
                        <div className="stat-card">
                            <div className="stat-value">{expert.usageCount.toLocaleString()}</div>
                            <div className="stat-label">使用次数</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{expert.knowledgeBases.length}</div>
                            <div className="stat-label">关联知识库</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{expert.tools.length}</div>
                            <div className="stat-label">可用工具</div>
                        </div>
                    </div>
                </div>

                {/* Capabilities */}
                <div className="detail-section">
                    <h3 className="detail-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />
                        </svg>
                        专业能力
                    </h3>
                    <div className="detail-tags">
                        {expert.capabilities.map(cap => (
                            <span key={cap} className="detail-tag">{cap}</span>
                        ))}
                    </div>
                </div>

                {/* Tools */}
                <div className="detail-section">
                    <h3 className="detail-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                        可用工具
                    </h3>
                    <div className="detail-tags">
                        {expert.tools.map(tool => (
                            <span key={tool} className="detail-tag">
                                {tool === 'knowledge-search' && '📚 知识库检索'}
                                {tool === 'literature-search' && '📄 文献检索'}
                                {tool === 'data-analysis' && '📊 数据分析'}
                                {tool === 'chart-generator' && '📈 图表生成'}
                            </span>
                        ))}
                    </div>
                </div>

                {/* System Prompt */}
                <div className="detail-section">
                    <h3 className="detail-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        核心提示词
                    </h3>
                    <pre className="detail-prompt">{expert.systemPrompt}</pre>
                </div>

                {/* Metadata */}
                <div className="detail-section">
                    <h3 className="detail-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                        </svg>
                        创建信息
                    </h3>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>创建时间：</span>
                            {formatDate(expert.createdAt)}
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>最后更新：</span>
                            {formatDate(expert.updatedAt)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
