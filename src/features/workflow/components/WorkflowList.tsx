import React, { useState } from 'react';
import type { SavedWorkflow } from '../types';

interface WorkflowListProps {
    isTemplate: boolean;
    searchQuery: string;
    categoryId: string;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onLoad: (workflow: SavedWorkflow) => void;
}

// Mock 工作流数据
const mockWorkflows: SavedWorkflow[] = [
    {
        id: 'wf-1',
        name: '慢性创面智能诊疗',
        description: '基于患者信息和创面特征，结合材料数据库和文献知识，生成个性化治疗方案',
        category: 'wound-care',
        tags: ['创面护理', '方案生成', 'AI诊疗'],
        isTemplate: false,
        version: 3,
        createdAt: '2024-03-01T10:00:00Z',
        updatedAt: '2024-03-20T14:30:00Z',
        createdBy: 'admin',
        nodeCount: 8,
        edgeCount: 10,
        status: 'published',
    },
    {
        id: 'wf-2',
        name: '生物材料综合分析',
        description: '对目标材料进行物化性质、生物相容性和临床应用潜力的多维度分析',
        category: 'material-analysis',
        tags: ['材料分析', '文献检索', '结构化报告'],
        isTemplate: false,
        version: 2,
        createdAt: '2024-02-15T09:00:00Z',
        updatedAt: '2024-03-18T11:20:00Z',
        createdBy: 'admin',
        nodeCount: 6,
        edgeCount: 7,
        status: 'published',
    },
    {
        id: 'wf-3',
        name: '文献智能摘要',
        description: '自动提取PDF文献的关键信息，生成结构化摘要和核心发现',
        category: 'literature-review',
        tags: ['文献处理', '信息提取', '自动摘要'],
        isTemplate: false,
        version: 1,
        createdAt: '2024-03-10T15:00:00Z',
        updatedAt: '2024-03-15T16:45:00Z',
        createdBy: 'admin',
        nodeCount: 5,
        edgeCount: 5,
        status: 'draft',
    },
    {
        id: 'wf-4',
        name: '材料对比分析模板',
        description: '预设的材料对比工作流模板，支持多种材料的系统性对比',
        category: 'material-analysis',
        tags: ['模板', '材料对比'],
        isTemplate: true,
        version: 1,
        createdAt: '2024-01-20T10:00:00Z',
        updatedAt: '2024-01-20T10:00:00Z',
        createdBy: 'system',
        nodeCount: 4,
        edgeCount: 4,
        status: 'published',
    },
    {
        id: 'wf-5',
        name: '用户意图分析模板',
        description: '识别用户查询意图并路由到相应的处理流程',
        category: 'wound-care',
        tags: ['模板', '意图识别', '路由'],
        isTemplate: true,
        version: 2,
        createdAt: '2024-02-01T10:00:00Z',
        updatedAt: '2024-02-28T14:00:00Z',
        createdBy: 'system',
        nodeCount: 6,
        edgeCount: 8,
        status: 'published',
    },
];

// 状态配置
const statusConfig = {
    draft: { label: '草稿', className: 'draft' },
    published: { label: '已发布', className: 'published' },
    archived: { label: '已归档', className: 'archived' },
};

// 格式化日期
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const WorkflowList: React.FC<WorkflowListProps> = ({
    isTemplate,
    searchQuery,
    categoryId,
    selectedId,
    onSelect,
    onLoad,
}) => {
    // 过滤工作流
    const filteredWorkflows = mockWorkflows.filter(wf => {
        // 模板筛选
        if (wf.isTemplate !== isTemplate) return false;

        // 分类筛选
        if (categoryId !== 'all' && wf.category !== categoryId) return false;

        // 搜索筛选
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                wf.name.toLowerCase().includes(query) ||
                wf.description.toLowerCase().includes(query) ||
                wf.tags.some(t => t.toLowerCase().includes(query))
            );
        }

        return true;
    });

    if (filteredWorkflows.length === 0) {
        return (
            <div className="wm-empty-state">
                <svg className="wm-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18M21 9H3" />
                </svg>
                <h3 className="wm-empty-title">
                    {isTemplate ? '暂无模板' : '暂无工作流'}
                </h3>
                <p className="wm-empty-description">
                    {searchQuery
                        ? '没有找到匹配的工作流，请尝试其他搜索关键词'
                        : isTemplate
                            ? '系统模板库为空，请联系管理员添加'
                            : '点击"新建工作流"创建您的第一个工作流'
                    }
                </p>
                {!isTemplate && !searchQuery && (
                    <button className="btn btn-primary">
                        新建工作流
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="workflow-grid">
            {filteredWorkflows.map(workflow => (
                <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    isSelected={selectedId === workflow.id}
                    onSelect={() => onSelect(workflow.id)}
                    onLoad={() => onLoad(workflow)}
                />
            ))}
        </div>
    );
};

interface WorkflowCardProps {
    workflow: SavedWorkflow;
    isSelected: boolean;
    onSelect: () => void;
    onLoad: () => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
    workflow,
    isSelected,
    onSelect,
    onLoad,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const status = statusConfig[workflow.status];

    const handleDoubleClick = () => {
        onLoad();
    };

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    return (
        <div
            className={`workflow-card ${isSelected ? 'selected' : ''}`}
            onClick={onSelect}
            onDoubleClick={handleDoubleClick}
        >
            <div className="workflow-card-header">
                <span className={`workflow-card-status ${status.className}`}>
                    {status.label}
                </span>
                <button className="workflow-card-menu" onClick={handleMenuClick}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                        <circle cx="12" cy="5" r="1" fill="currentColor" />
                        <circle cx="12" cy="12" r="1" fill="currentColor" />
                        <circle cx="12" cy="19" r="1" fill="currentColor" />
                    </svg>
                </button>
            </div>

            <h3 className="workflow-card-title">{workflow.name}</h3>
            <p className="workflow-card-description">{workflow.description}</p>

            <div className="workflow-card-tags">
                {workflow.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="workflow-tag">{tag}</span>
                ))}
                {workflow.tags.length > 3 && (
                    <span className="workflow-tag">+{workflow.tags.length - 3}</span>
                )}
            </div>

            <div className="workflow-card-meta">
                <div className="workflow-card-stats">
                    <span className="workflow-stat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                        {workflow.nodeCount} 节点
                    </span>
                    <span className="workflow-stat">
                        v{workflow.version}
                    </span>
                </div>
                <span>{formatDate(workflow.updatedAt)}</span>
            </div>
        </div>
    );
};
