import React from 'react';
import { Zap } from 'lucide-react';
import type { Expert } from '../types';

interface ExpertListProps {
    systemExperts: Expert[];
    customExperts: Expert[];
    selectedExpert: Expert | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onSelectExpert: (expert: Expert) => void;
    onCreateExpert: () => void;
    onOpenTemplates: () => void;
}

export const ExpertList: React.FC<ExpertListProps> = ({
    systemExperts,
    customExperts,
    selectedExpert,
    searchQuery,
    onSearchChange,
    onSelectExpert,
    onCreateExpert,
    onOpenTemplates,
}) => {
    return (
        <aside className="expert-list-panel">
            {/* Header */}
            <div className="expert-list-header">
                <h2 className="expert-list-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                    </svg>
                    专家库
                </h2>
                <div className="expert-search">
                    <svg className="expert-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className="expert-search-input"
                        placeholder="搜索专家..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Create Buttons */}
            <div className="expert-list-actions">
                <button className="create-expert-btn" onClick={onCreateExpert}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    通过对话创建专家
                </button>
                <button className="template-btn" onClick={onOpenTemplates}>
                    <Zap size={18} />
                    从模板创建
                </button>
            </div>


            {/* Expert List */}
            <div className="expert-list-content">
                {/* System Experts */}
                {systemExperts.length > 0 && (
                    <div className="expert-section">
                        <div className="expert-section-title">系统专家</div>
                        {systemExperts.map(expert => (
                            <ExpertCard
                                key={expert.id}
                                expert={expert}
                                isSelected={selectedExpert?.id === expert.id}
                                onClick={() => onSelectExpert(expert)}
                            />
                        ))}
                    </div>
                )}

                {/* Custom Experts */}
                {customExperts.length > 0 && (
                    <div className="expert-section">
                        <div className="expert-section-title">我的专家</div>
                        {customExperts.map(expert => (
                            <ExpertCard
                                key={expert.id}
                                expert={expert}
                                isSelected={selectedExpert?.id === expert.id}
                                onClick={() => onSelectExpert(expert)}
                            />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {systemExperts.length === 0 && customExperts.length === 0 && (
                    <div style={{
                        padding: 'var(--space-6)',
                        textAlign: 'center',
                        color: 'var(--text-muted)'
                    }}>
                        没有找到匹配的专家
                    </div>
                )}
            </div>
        </aside>
    );
};

// Expert Card Component
interface ExpertCardProps {
    expert: Expert;
    isSelected: boolean;
    onClick: () => void;
}

const ExpertCard: React.FC<ExpertCardProps> = ({ expert, isSelected, onClick }) => (
    <div
        className={`expert-card ${isSelected ? 'selected' : ''} ${expert.isSystem ? 'system' : ''}`}
        onClick={onClick}
    >
        <div className="expert-avatar">{expert.avatar}</div>
        <div className="expert-info">
            <div className="expert-name">
                {expert.name}
                <span className={`expert-badge ${expert.isSystem ? 'system' : 'custom'}`}>
                    {expert.isSystem ? '系统' : '自定义'}
                </span>
            </div>
            <div className="expert-domain">{expert.domain}</div>
            <div className="expert-capabilities">
                {expert.capabilities.slice(0, 3).map(cap => (
                    <span key={cap} className="capability-tag">{cap}</span>
                ))}
                {expert.capabilities.length > 3 && (
                    <span className="capability-tag">+{expert.capabilities.length - 3}</span>
                )}
            </div>
        </div>
    </div>
);
