/**
 * Agent 思考过程展示组件
 * 显示 Agent 的推理步骤和思维链
 */

import React from 'react';
import type { ThinkingStep, ThinkingStepType } from '../agent';
import './ThinkingProcess.css';

interface ThinkingProcessProps {
    steps: ThinkingStep[];
    isThinking: boolean;
    collapsed?: boolean;
    onToggle?: () => void;
}

// 步骤类型配置
const STEP_CONFIG: Record<ThinkingStepType, {
    icon: string;
    label: string;
    color: string;
}> = {
    analyzing: {
        icon: '🔍',
        label: '意图分析',
        color: '#6366f1', // 紫色
    },
    planning: {
        icon: '📋',
        label: '执行规划',
        color: '#0ea5e9', // 蓝色
    },
    querying: {
        icon: '🗃️',
        label: 'SQL 生成',
        color: '#22c55e', // 绿色
    },
    executing: {
        icon: '⚡',
        label: '执行查询',
        color: '#f59e0b', // 橙色
    },
    observing: {
        icon: '👀',
        label: '观察结果',
        color: '#10b981', // 绿色
    },
    reasoning: {
        icon: '🧠',
        label: '推理分析',
        color: '#8b5cf6', // 紫色
    },
    responding: {
        icon: '💬',
        label: '生成回复',
        color: '#ec4899', // 粉色
    },
};

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({
    steps,
    isThinking,
    collapsed = false,
    onToggle,
}) => {
    // 只有在没有步骤且不在思考时才完全隐藏
    if (steps.length === 0 && !isThinking) {
        return null;
    }

    // 调试日志
    console.log('[ThinkingProcess] Rendering:', { stepsCount: steps.length, isThinking, collapsed });

    return (
        <div className={`thinking-process ${collapsed ? 'collapsed' : ''}`}>
            {/* 头部 */}
            <div className="thinking-header" onClick={onToggle}>
                <div className="thinking-title">
                    <span className="thinking-icon">🧠</span>
                    <span>Agent 思考过程</span>
                    {isThinking && <span className="thinking-indicator">思考中...</span>}
                </div>
                <button className="toggle-btn">
                    {collapsed ? '展开' : '收起'}
                </button>
            </div>

            {/* 步骤列表 */}
            {!collapsed && (
                <div className="thinking-steps">
                    {steps.map((step, index) => {
                        const config = STEP_CONFIG[step.type];
                        return (
                            <div
                                key={step.id}
                                className="thinking-step"
                                style={{ '--step-color': config.color } as React.CSSProperties}
                            >
                                {/* 时间线连接器 */}
                                <div className="step-timeline">
                                    <div className="step-dot" />
                                    {index < steps.length - 1 && <div className="step-line" />}
                                </div>

                                {/* 步骤内容 */}
                                <div className="step-content">
                                    <div className="step-header">
                                        <span className="step-icon">{config.icon}</span>
                                        <span className="step-label">{config.label}</span>
                                    </div>
                                    <div className="step-text">{step.content}</div>

                                    {/* SQL 显示 */}
                                    {step.metadata?.sql && (
                                        <div className="step-sql">
                                            <pre><code>{String(step.metadata.sql)}</code></pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* 思考中的占位 */}
                    {isThinking && (
                        <div className="thinking-step loading">
                            <div className="step-timeline">
                                <div className="step-dot pulsing" />
                            </div>
                            <div className="step-content">
                                <div className="loading-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )
            }
        </div >
    );
};

export default ThinkingProcess;
