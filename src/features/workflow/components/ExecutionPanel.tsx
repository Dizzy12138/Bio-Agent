import React from 'react';
import { createPortal } from 'react-dom';
import { useWorkflowStore } from '../../../stores';
import '../WorkflowManager.css';

interface ExecutionPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ isOpen, onClose }) => {
    const { execution, startExecution, clearExecution } = useWorkflowStore();

    const handleRun = () => {
        startExecution();
        // 模拟执行过程...
    };

    const handleStop = () => {
        clearExecution();
    };

    const panelContent = (
        <aside className={`execution-panel ${isOpen ? 'open' : ''}`}>
            <header className="execution-panel-header">
                <h2 className="execution-panel-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                        <polygon points="5,3 19,12 5,21 5,3" />
                    </svg>
                    执行调试
                </h2>
                <button
                    onClick={onClose}
                    style={{
                        width: 32,
                        height: 32,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </header>

            <div className="execution-panel-body">
                {!execution ? (
                    <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 64, height: 64, color: 'var(--neutral-300)' }}>
                                <polygon points="5,3 19,12 5,21 5,3" />
                            </svg>
                        </div>
                        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                            准备执行
                        </h3>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                            点击运行按钮开始执行工作流
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={handleRun}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                <polygon points="5,3 19,12 5,21 5,3" />
                            </svg>
                            运行工作流
                        </button>
                    </div>
                ) : (
                    <>
                        {/* 执行状态 */}
                        <div className="execution-section">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                                <span className={`execution-status-badge ${execution.status}`}>
                                    {execution.status === 'running' && '运行中'}
                                    {execution.status === 'completed' && '已完成'}
                                    {execution.status === 'error' && '执行错误'}
                                </span>
                                {execution.status === 'running' && (
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={handleStop}
                                    >
                                        停止
                                    </button>
                                )}
                            </div>

                            {execution.startTime && (
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                    开始时间: {new Date(execution.startTime).toLocaleTimeString()}
                                </div>
                            )}
                        </div>

                        {/* 执行日志 */}
                        <div className="execution-section">
                            <div className="execution-section-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="8" y1="6" x2="21" y2="6" />
                                    <line x1="8" y1="12" x2="21" y2="12" />
                                    <line x1="8" y1="18" x2="21" y2="18" />
                                    <circle cx="4" cy="6" r="1" fill="currentColor" />
                                    <circle cx="4" cy="12" r="1" fill="currentColor" />
                                    <circle cx="4" cy="18" r="1" fill="currentColor" />
                                </svg>
                                执行步骤
                            </div>

                            {execution.logs.length === 0 ? (
                                <div style={{
                                    padding: 'var(--space-4)',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    fontSize: 'var(--text-sm)',
                                }}>
                                    等待执行...
                                </div>
                            ) : (
                                execution.logs.map(log => (
                                    <div
                                        key={log.id}
                                        className={`execution-node-log ${log.status}`}
                                    >
                                        <div className="execution-node-header">
                                            <span className="execution-node-name">{log.nodeName}</span>
                                            <div className={`execution-node-status ${log.status}`}>
                                                {log.status === 'running' && (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                    </svg>
                                                )}
                                                {log.status === 'success' && (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                                        <polyline points="20,6 9,17 4,12" />
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
                                        </div>
                                        {log.error && (
                                            <div style={{
                                                marginTop: 'var(--space-2)',
                                                fontSize: 'var(--text-xs)',
                                                color: 'var(--error-500)'
                                            }}>
                                                {log.error}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 变量状态 */}
                        {Object.keys(execution.variables).length > 0 && (
                            <div className="execution-section">
                                <div className="execution-section-title">变量状态</div>
                                <pre style={{
                                    fontSize: 'var(--text-xs)',
                                    background: 'var(--bg-tertiary)',
                                    padding: 'var(--space-3)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'auto',
                                    maxHeight: '200px',
                                }}>
                                    {JSON.stringify(execution.variables, null, 2)}
                                </pre>
                            </div>
                        )}
                    </>
                )}
            </div>
        </aside>
    );

    // 使用 Portal 将面板渲染到 body，避免 React Flow Panel 容器影响定位
    return createPortal(panelContent, document.body);
};

