import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Expert } from '../types';
import { EXPERT_DOMAINS, EXPERT_CAPABILITIES } from '../types';

interface ExpertEditModalProps {
    expert: Expert;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedExpert: Expert) => void;
}

// 可用的知识库
const AVAILABLE_KNOWLEDGE_BASES = [
    { id: 'kb-wound-care', name: '创面护理知识库', icon: '🩹', docCount: 256 },
    { id: 'kb-biomaterials', name: '生物材料数据库', icon: '🧬', docCount: 1024 },
    { id: 'kb-literature', name: '学术文献库', icon: '📚', docCount: 5000 },
    { id: 'kb-protocols', name: '实验方案库', icon: '🔬', docCount: 128 },
    { id: 'kb-clinical', name: '临床指南库', icon: '💊', docCount: 89 },
];

// 可用的工具
const AVAILABLE_TOOLS = [
    { id: 'knowledge-search', name: '知识库检索', icon: '📚', description: '从关联知识库中检索相关信息' },
    { id: 'literature-search', name: '文献检索', icon: '📄', description: '检索PubMed、Web of Science等数据库' },
    { id: 'data-analysis', name: '数据分析', icon: '📊', description: '分析实验数据，生成统计报告' },
    { id: 'chart-generator', name: '图表生成', icon: '📈', description: '根据数据生成可视化图表' },
    { id: 'image-analysis', name: '图像分析', icon: '🖼️', description: '分析创面图像，评估愈合进度' },
];

const AVATAR_OPTIONS = ['🧑‍⚕️', '👨‍🔬', '👩‍🔬', '🧑‍🏫', '👨‍💼', '👩‍💼', '🤖', '🧬', '💊', '🔬', '📊', '📚', '🩹', '🎓', '💡'];

export const ExpertEditModal: React.FC<ExpertEditModalProps> = ({
    expert,
    isOpen,
    onClose,
    onSave,
}) => {
    const [formData, setFormData] = useState<Expert>(expert);
    const [activeTab, setActiveTab] = useState<'basic' | 'capabilities' | 'tools' | 'knowledge' | 'prompt'>('basic');

    useEffect(() => {
        setFormData(expert);
    }, [expert]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSave = () => {
        onSave({
            ...formData,
            updatedAt: new Date().toISOString(),
        });
    };

    const toggleCapability = (capability: string) => {
        setFormData(prev => ({
            ...prev,
            capabilities: prev.capabilities.includes(capability)
                ? prev.capabilities.filter(c => c !== capability)
                : [...prev.capabilities, capability],
        }));
    };

    const toggleTool = (toolId: string) => {
        setFormData(prev => ({
            ...prev,
            tools: prev.tools.includes(toolId)
                ? prev.tools.filter(t => t !== toolId)
                : [...prev.tools, toolId],
        }));
    };

    const toggleKnowledgeBase = (kbId: string) => {
        setFormData(prev => ({
            ...prev,
            knowledgeBases: prev.knowledgeBases.includes(kbId)
                ? prev.knowledgeBases.filter(k => k !== kbId)
                : [...prev.knowledgeBases, kbId],
        }));
    };

    const tabs = [
        { id: 'basic', label: '基本信息', icon: '📋' },
        { id: 'capabilities', label: '能力标签', icon: '⭐' },
        { id: 'tools', label: '可用工具', icon: '🔧' },
        { id: 'knowledge', label: '知识库', icon: '📚' },
        { id: 'prompt', label: '提示词', icon: '💬' },
    ] as const;

    const modalContent = (
        <div className="expert-edit-overlay" onClick={handleBackdropClick}>
            <div className="expert-edit-modal">
                {/* Header */}
                <header className="edit-modal-header">
                    <div className="edit-modal-title-area">
                        <span className="edit-modal-avatar">{formData.avatar}</span>
                        <div>
                            <h2 className="edit-modal-title">编辑专家</h2>
                            <p className="edit-modal-subtitle">{formData.name}</p>
                        </div>
                    </div>
                    <button className="edit-modal-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </header>

                {/* Tabs */}
                <div className="edit-modal-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`edit-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="edit-modal-content">
                    {activeTab === 'basic' && (
                        <div className="edit-section">
                            {/* Avatar Selection */}
                            <div className="edit-field">
                                <label className="edit-label">头像</label>
                                <div className="avatar-grid">
                                    {AVATAR_OPTIONS.map(avatar => (
                                        <button
                                            key={avatar}
                                            className={`avatar-option ${formData.avatar === avatar ? 'selected' : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, avatar }))}
                                        >
                                            {avatar}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name */}
                            <div className="edit-field">
                                <label className="edit-label">名称</label>
                                <input
                                    type="text"
                                    className="edit-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            {/* Domain */}
                            <div className="edit-field">
                                <label className="edit-label">专业领域</label>
                                <div className="domain-options">
                                    {EXPERT_DOMAINS.map(domain => (
                                        <button
                                            key={domain.id}
                                            className={`domain-option ${formData.domain === domain.name ? 'selected' : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, domain: domain.name }))}
                                        >
                                            <span>{domain.icon}</span>
                                            <span>{domain.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="edit-field">
                                <label className="edit-label">描述</label>
                                <textarea
                                    className="edit-textarea"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'capabilities' && (
                        <div className="edit-section">
                            <p className="section-hint">选择该专家具备的能力，这将帮助系统更好地理解专家的专长。</p>
                            <div className="capability-grid">
                                {EXPERT_CAPABILITIES.map(cap => (
                                    <button
                                        key={cap}
                                        className={`capability-option ${formData.capabilities.includes(cap) ? 'selected' : ''}`}
                                        onClick={() => toggleCapability(cap)}
                                    >
                                        <span className="capability-check">
                                            {formData.capabilities.includes(cap) ? '✓' : ''}
                                        </span>
                                        <span>{cap}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'tools' && (
                        <div className="edit-section">
                            <p className="section-hint">选择该专家可以使用的工具，工具将在对话中自动调用。</p>
                            <div className="tool-list">
                                {AVAILABLE_TOOLS.map(tool => (
                                    <div
                                        key={tool.id}
                                        className={`tool-item ${formData.tools.includes(tool.id) ? 'selected' : ''}`}
                                        onClick={() => toggleTool(tool.id)}
                                    >
                                        <div className="tool-icon">{tool.icon}</div>
                                        <div className="tool-info">
                                            <div className="tool-name">{tool.name}</div>
                                            <div className="tool-desc">{tool.description}</div>
                                        </div>
                                        <div className="tool-check">
                                            {formData.tools.includes(tool.id) && (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="20,6 9,17 4,12" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'knowledge' && (
                        <div className="edit-section">
                            <p className="section-hint">选择该专家可以访问的知识库，专家将从这些知识库中检索信息。</p>
                            <div className="knowledge-list">
                                {AVAILABLE_KNOWLEDGE_BASES.map(kb => (
                                    <div
                                        key={kb.id}
                                        className={`knowledge-item ${formData.knowledgeBases.includes(kb.id) ? 'selected' : ''}`}
                                        onClick={() => toggleKnowledgeBase(kb.id)}
                                    >
                                        <div className="knowledge-icon">{kb.icon}</div>
                                        <div className="knowledge-info">
                                            <div className="knowledge-name">{kb.name}</div>
                                            <div className="knowledge-meta">{kb.docCount.toLocaleString()} 篇文档</div>
                                        </div>
                                        <div className="knowledge-check">
                                            {formData.knowledgeBases.includes(kb.id) && (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="20,6 9,17 4,12" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'prompt' && (
                        <div className="edit-section">
                            <p className="section-hint">编辑专家的核心提示词，定义专家的行为、专业背景和回答风格。</p>
                            <div className="edit-field">
                                <label className="edit-label">系统提示词</label>
                                <textarea
                                    className="edit-textarea prompt-textarea"
                                    value={formData.systemPrompt}
                                    onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                                    rows={12}
                                    placeholder="描述专家的角色、专业知识、回答风格和需要遵循的原则..."
                                />
                            </div>
                            <div className="prompt-tips">
                                <h4>提示词编写建议：</h4>
                                <ul>
                                    <li>明确专家的角色定位和专业背景</li>
                                    <li>描述专家应该如何回答问题</li>
                                    <li>列出关键的知识领域和专长</li>
                                    <li>说明需要遵循的原则和限制</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="edit-modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>
                        取消
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        保存更改
                    </button>
                </footer>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
