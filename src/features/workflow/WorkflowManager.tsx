import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { WorkflowList } from './components/WorkflowList';
import { VersionHistory } from './components/VersionHistory';
import { ExecutionHistory } from './components/ExecutionHistory';
import type { SavedWorkflow, WorkflowCategory } from './types';
import './WorkflowManager.css';

interface WorkflowManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadWorkflow: (workflow: SavedWorkflow) => void;
}

type TabType = 'workflows' | 'templates' | 'history' | 'executions';

// Mock 分类数据
const mockCategories: WorkflowCategory[] = [
    { id: 'all', name: '全部工作流', icon: '📁', count: 12 },
    { id: 'wound-care', name: '创面护理', icon: '🩹', count: 5 },
    { id: 'material-analysis', name: '材料分析', icon: '🔬', count: 4 },
    { id: 'literature-review', name: '文献综述', icon: '📚', count: 3 },
];

// Icons
const Icons = {
    Workflows: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M21 9H3M21 15H3" />
        </svg>
    ),
    Templates: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <path d="M12 18v-6M9 15l3 3 3-3" />
        </svg>
    ),
    History: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
        </svg>
    ),
    Executions: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5,3 19,12 5,21 5,3" />
        </svg>
    ),
    Search: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    Plus: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    Close: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    Folder: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    ),
};

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({
    isOpen,
    onClose,
    onLoadWorkflow,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('workflows');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'workflows':
            case 'templates':
                return (
                    <WorkflowList
                        isTemplate={activeTab === 'templates'}
                        searchQuery={searchQuery}
                        categoryId={selectedCategory}
                        selectedId={selectedWorkflowId}
                        onSelect={setSelectedWorkflowId}
                        onLoad={onLoadWorkflow}
                    />
                );
            case 'history':
                return (
                    <VersionHistory
                        workflowId={selectedWorkflowId}
                    />
                );
            case 'executions':
                return (
                    <ExecutionHistory />
                );
            default:
                return null;
        }
    };

    const modalContent = (
        <div className="workflow-manager-overlay" onClick={handleBackdropClick}>
            <div className="workflow-manager">
                {/* Header */}
                <header className="workflow-manager-header">
                    <h2 className="workflow-manager-title">
                        <Icons.Folder />
                        工作流管理
                    </h2>
                    <button className="workflow-manager-close" onClick={onClose}>
                        <Icons.Close />
                    </button>
                </header>

                {/* Body */}
                <div className="workflow-manager-body">
                    {/* Sidebar */}
                    <aside className="wm-sidebar">
                        <div className="wm-sidebar-section">
                            <div className="wm-sidebar-section-title">导航</div>
                            <div className="wm-nav-list">
                                <button
                                    className={`wm-nav-item ${activeTab === 'workflows' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('workflows')}
                                >
                                    <Icons.Workflows />
                                    我的工作流
                                    <span className="wm-nav-count">12</span>
                                </button>
                                <button
                                    className={`wm-nav-item ${activeTab === 'templates' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('templates')}
                                >
                                    <Icons.Templates />
                                    模板库
                                    <span className="wm-nav-count">8</span>
                                </button>
                                <button
                                    className={`wm-nav-item ${activeTab === 'history' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('history')}
                                >
                                    <Icons.History />
                                    版本历史
                                </button>
                                <button
                                    className={`wm-nav-item ${activeTab === 'executions' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('executions')}
                                >
                                    <Icons.Executions />
                                    执行记录
                                    <span className="wm-nav-count">24</span>
                                </button>
                            </div>
                        </div>

                        {(activeTab === 'workflows' || activeTab === 'templates') && (
                            <div className="wm-sidebar-section">
                                <div className="wm-sidebar-section-title">分类</div>
                                <div className="wm-nav-list">
                                    {mockCategories.map(cat => (
                                        <button
                                            key={cat.id}
                                            className={`wm-nav-item ${selectedCategory === cat.id ? 'active' : ''}`}
                                            onClick={() => setSelectedCategory(cat.id)}
                                        >
                                            <span>{cat.icon}</span>
                                            {cat.name}
                                            <span className="wm-nav-count">{cat.count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* Main Content */}
                    <main className="wm-content">
                        <header className="wm-content-header">
                            <div className="wm-search">
                                <span className="wm-search-icon">
                                    <Icons.Search />
                                </span>
                                <input
                                    type="text"
                                    className="wm-search-input"
                                    placeholder="搜索工作流..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="wm-content-actions">
                                {activeTab === 'workflows' && (
                                    <button className="btn btn-primary">
                                        <Icons.Plus />
                                        新建工作流
                                    </button>
                                )}
                            </div>
                        </header>

                        <div className="wm-content-body">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );

    // 使用 Portal 将模态框渲染到 body - 仅在打开时渲染
    return isOpen ? createPortal(modalContent, document.body) : null;
};

