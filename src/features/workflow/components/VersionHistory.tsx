import React from 'react';
import type { WorkflowVersion } from '../types';

interface VersionHistoryProps {
    workflowId: string | null;
}

// Mock 版本历史数据
const mockVersions: WorkflowVersion[] = [
    {
        id: 'v-1',
        workflowId: 'wf-1',
        version: 3,
        versionLabel: 'v3.0 - 优化方案生成',
        description: '优化了治疗方案的生成逻辑，增加了更多的临床考量因素',
        changes: [
            '增加感染风险评估节点',
            '优化敷料推荐算法',
            '增加随访建议模块',
        ],
        createdAt: '2024-03-20T14:30:00Z',
        createdBy: 'admin',
        nodeSnapshot: '{}',
        edgeSnapshot: '{}',
    },
    {
        id: 'v-2',
        workflowId: 'wf-1',
        version: 2,
        versionLabel: 'v2.0 - 增加材料检索',
        description: '集成材料数据库，支持智能材料推荐',
        changes: [
            '新增材料检索工具节点',
            '增加材料属性对比功能',
            '修复路由逻辑bug',
        ],
        createdAt: '2024-03-10T10:00:00Z',
        createdBy: 'admin',
        nodeSnapshot: '{}',
        edgeSnapshot: '{}',
    },
    {
        id: 'v-3',
        workflowId: 'wf-1',
        version: 1,
        versionLabel: 'v1.0 - 初始版本',
        description: '创建基础的创面诊疗工作流',
        changes: [
            '创建工作流基础结构',
            '配置LLM推理节点',
            '设置输出格式',
        ],
        createdAt: '2024-03-01T10:00:00Z',
        createdBy: 'admin',
        nodeSnapshot: '{}',
        edgeSnapshot: '{}',
    },
];

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const VersionHistory: React.FC<VersionHistoryProps> = ({ workflowId }) => {
    if (!workflowId) {
        return (
            <div className="wm-empty-state">
                <svg className="wm-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                </svg>
                <h3 className="wm-empty-title">选择一个工作流</h3>
                <p className="wm-empty-description">
                    请先在左侧选择一个工作流，然后查看其版本历史
                </p>
            </div>
        );
    }

    return (
        <div className="version-history">
            <div className="version-timeline">
                {mockVersions.map((version, index) => (
                    <div
                        key={version.id}
                        className={`version-item ${index === 0 ? 'current' : ''}`}
                    >
                        <div className="version-header">
                            <span className="version-label">
                                {version.versionLabel}
                                {index === 0 && <span className="version-badge current">当前</span>}
                            </span>
                            <span className="version-time">{formatDateTime(version.createdAt)}</span>
                        </div>

                        <p className="version-description">{version.description}</p>

                        <div className="version-changes">
                            {version.changes.map((change, i) => (
                                <div key={i} className="version-change">{change}</div>
                            ))}
                        </div>

                        <div className="version-actions">
                            {index !== 0 && (
                                <>
                                    <button className="btn btn-outline btn-sm">查看</button>
                                    <button className="btn btn-outline btn-sm">恢复此版本</button>
                                </>
                            )}
                            {index === 0 && (
                                <button className="btn btn-outline btn-sm">查看详情</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
