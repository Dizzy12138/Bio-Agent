import React, { useState } from 'react';
import type { ExecutionRecord, ExecutionNodeLog } from '../types';

// Mock 执行记录数据
const mockExecutions: ExecutionRecord[] = [
    {
        id: 'exec-1',
        workflowId: 'wf-1',
        workflowName: '慢性创面智能诊疗',
        status: 'completed',
        startTime: '2024-03-20T14:30:00Z',
        endTime: '2024-03-20T14:30:45Z',
        duration: 45000,
        initiatedBy: 'admin',
        input: { patientAge: 65, woundType: '压疮' },
        output: { recommendation: '...' },
        logs: [
            { id: 'log-1', nodeId: 'start-1', nodeName: '开始', nodeType: 'start', status: 'success', startTime: '2024-03-20T14:30:00Z', endTime: '2024-03-20T14:30:01Z', duration: 1000 },
            { id: 'log-2', nodeId: 'llm-1', nodeName: '意图识别', nodeType: 'llm', status: 'success', startTime: '2024-03-20T14:30:01Z', endTime: '2024-03-20T14:30:05Z', duration: 4000, llmTokens: { prompt: 256, completion: 128, total: 384 } },
            { id: 'log-3', nodeId: 'tool-1', nodeName: '材料检索', nodeType: 'tool', status: 'success', startTime: '2024-03-20T14:30:05Z', endTime: '2024-03-20T14:30:20Z', duration: 15000 },
            { id: 'log-4', nodeId: 'llm-2', nodeName: '方案生成', nodeType: 'llm', status: 'success', startTime: '2024-03-20T14:30:20Z', endTime: '2024-03-20T14:30:42Z', duration: 22000, llmTokens: { prompt: 1024, completion: 512, total: 1536 } },
            { id: 'log-5', nodeId: 'output-1', nodeName: '输出结果', nodeType: 'output', status: 'success', startTime: '2024-03-20T14:30:42Z', endTime: '2024-03-20T14:30:45Z', duration: 3000 },
        ],
    },
    {
        id: 'exec-2',
        workflowId: 'wf-2',
        workflowName: '生物材料综合分析',
        status: 'running',
        startTime: '2024-03-20T15:00:00Z',
        duration: 0,
        initiatedBy: 'admin',
        input: { materialName: 'PEG水凝胶' },
        logs: [
            { id: 'log-6', nodeId: 'start-1', nodeName: '开始', nodeType: 'start', status: 'success', startTime: '2024-03-20T15:00:00Z', endTime: '2024-03-20T15:00:01Z', duration: 1000 },
            { id: 'log-7', nodeId: 'tool-1', nodeName: '文献检索', nodeType: 'tool', status: 'running', startTime: '2024-03-20T15:00:01Z' },
            { id: 'log-8', nodeId: 'llm-1', nodeName: '信息提取', nodeType: 'llm', status: 'pending' },
        ],
    },
    {
        id: 'exec-3',
        workflowId: 'wf-1',
        workflowName: '慢性创面智能诊疗',
        status: 'error',
        startTime: '2024-03-20T10:00:00Z',
        endTime: '2024-03-20T10:00:30Z',
        duration: 30000,
        initiatedBy: 'user1',
        input: { patientAge: 45 },
        error: 'LLM API 请求超时',
        logs: [
            { id: 'log-9', nodeId: 'start-1', nodeName: '开始', nodeType: 'start', status: 'success', duration: 1000 },
            { id: 'log-10', nodeId: 'llm-1', nodeName: '意图识别', nodeType: 'llm', status: 'error', duration: 29000, error: 'Request timeout after 30000ms' },
        ],
    },
];

// 状态配置
const statusConfig = {
    running: { label: '运行中', className: 'running' },
    completed: { label: '已完成', className: 'completed' },
    error: { label: '错误', className: 'error' },
    cancelled: { label: '已取消', className: 'cancelled' },
};

// 格式化时间
const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
};

// Node Icons
const nodeIcons: Record<string, string> = {
    start: '▶',
    llm: '🤖',
    tool: '🔧',
    router: '🔀',
    output: '📤',
};

export const ExecutionHistory: React.FC = () => {
    const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null);

    return (
        <div style={{ display: 'flex', gap: 'var(--space-4)', height: '100%' }}>
            {/* 执行列表 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {mockExecutions.map(execution => (
                        <ExecutionCard
                            key={execution.id}
                            execution={execution}
                            isSelected={selectedExecution?.id === execution.id}
                            onClick={() => setSelectedExecution(execution)}
                        />
                    ))}
                </div>
            </div>

            {/* 执行详情 */}
            {selectedExecution && (
                <div style={{ width: '400px', borderLeft: '1px solid var(--border-color)', paddingLeft: 'var(--space-4)' }}>
                    <ExecutionDetail execution={selectedExecution} />
                </div>
            )}
        </div>
    );
};

interface ExecutionCardProps {
    execution: ExecutionRecord;
    isSelected: boolean;
    onClick: () => void;
}

const ExecutionCard: React.FC<ExecutionCardProps> = ({ execution, isSelected, onClick }) => {
    const status = statusConfig[execution.status];

    return (
        <div
            onClick={onClick}
            style={{
                padding: 'var(--space-3) var(--space-4)',
                background: isSelected ? 'var(--primary-50)' : 'var(--bg-secondary)',
                border: `1px solid ${isSelected ? 'var(--primary-500)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{execution.workflowName}</span>
                <span className={`execution-status-badge ${status.className}`}>{status.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <span>{formatDate(execution.startTime)} {formatTime(execution.startTime)}</span>
                {execution.duration && <span>{formatDuration(execution.duration)}</span>}
                <span>{execution.logs.length} 步骤</span>
            </div>
            {execution.error && (
                <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--error-500)' }}>
                    ⚠ {execution.error}
                </div>
            )}
        </div>
    );
};

interface ExecutionDetailProps {
    execution: ExecutionRecord;
}

const ExecutionDetail: React.FC<ExecutionDetailProps> = ({ execution }) => {
    return (
        <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                执行详情
            </h3>

            {/* 节点日志 */}
            <div className="execution-section">
                <div className="execution-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <circle cx="4" cy="6" r="1" fill="currentColor" />
                        <circle cx="4" cy="12" r="1" fill="currentColor" />
                        <circle cx="4" cy="18" r="1" fill="currentColor" />
                    </svg>
                    执行步骤
                </div>

                {execution.logs.map(log => (
                    <ExecutionNodeLogItem key={log.id} log={log} />
                ))}
            </div>

            {/* 输入参数 */}
            <div className="execution-section">
                <div className="execution-section-title">输入参数</div>
                <pre style={{
                    fontSize: 'var(--text-xs)',
                    background: 'var(--bg-tertiary)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'auto',
                }}>
                    {JSON.stringify(execution.input, null, 2)}
                </pre>
            </div>

            {/* 输出结果 */}
            {execution.output && (
                <div className="execution-section">
                    <div className="execution-section-title">输出结果</div>
                    <pre style={{
                        fontSize: 'var(--text-xs)',
                        background: 'var(--bg-tertiary)',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'auto',
                    }}>
                        {JSON.stringify(execution.output, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

interface ExecutionNodeLogItemProps {
    log: ExecutionNodeLog;
}

const ExecutionNodeLogItem: React.FC<ExecutionNodeLogItemProps> = ({ log }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`execution-node-log ${log.status}`}
            onClick={() => setExpanded(!expanded)}
        >
            <div className="execution-node-header">
                <div className={`execution-node-icon ${log.nodeType}`}>
                    {nodeIcons[log.nodeType] || '?'}
                </div>
                <span className="execution-node-name">{log.nodeName}</span>

                {/* 状态图标 */}
                <div className={`execution-node-status ${log.status}`}>
                    {log.status === 'pending' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                    )}
                    {log.status === 'running' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                    )}
                    {log.status === 'success' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22,4 12,14.01 9,11.01" />
                        </svg>
                    )}
                    {log.status === 'error' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    )}
                </div>

                {log.duration && (
                    <span className="execution-node-duration">{formatDuration(log.duration)}</span>
                )}
            </div>

            {expanded && (
                <div className="execution-node-details">
                    {log.error && (
                        <div className="execution-detail-row">
                            <span className="execution-detail-label">错误:</span>
                            <span className="execution-detail-value" style={{ color: 'var(--error-500)' }}>{log.error}</span>
                        </div>
                    )}
                    {log.llmTokens && (
                        <div className="execution-node-tokens">
                            <span className="token-stat">Prompt: {log.llmTokens.prompt}</span>
                            <span className="token-stat">Completion: {log.llmTokens.completion}</span>
                            <span className="token-stat">Total: {log.llmTokens.total}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
