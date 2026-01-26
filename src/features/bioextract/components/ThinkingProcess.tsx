import React from 'react';
import type { ThinkingStep, ThinkingStepType } from '../agent';
import { Brain, Search, LayoutList, Database, Wrench, Zap, Eye, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface ThinkingProcessProps {
    steps: ThinkingStep[];
    isThinking: boolean;
    collapsed?: boolean;
    onToggle?: () => void;
}

// 步骤类型配置
const STEP_CONFIG: Record<ThinkingStepType, {
    icon: React.ReactNode;
    label: string;
    bg: string;
    text: string;
    border: string;
}> = {
    analyzing: {
        icon: <Search size={14} />,
        label: '意图分析',
        bg: 'bg-indigo-50',
        text: 'text-indigo-600',
        border: 'border-indigo-200'
    },
    planning: {
        icon: <LayoutList size={14} />,
        label: '执行规划',
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200'
    },
    querying: {
        icon: <Database size={14} />,
        label: 'SQL 生成',
        bg: 'bg-green-50',
        text: 'text-green-600',
        border: 'border-green-200'
    },
    tool_calling: {
        icon: <Wrench size={14} />,
        label: '工具调用',
        bg: 'bg-fuchsia-50',
        text: 'text-fuchsia-600',
        border: 'border-fuchsia-200'
    },
    executing: {
        icon: <Zap size={14} />,
        label: '执行操作',
        bg: 'bg-amber-50',
        text: 'text-amber-600',
        border: 'border-amber-200'
    },
    observing: {
        icon: <Eye size={14} />,
        label: '观察结果',
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        border: 'border-emerald-200'
    },
    reasoning: {
        icon: <Brain size={14} />,
        label: '推理分析',
        bg: 'bg-violet-50',
        text: 'text-violet-600',
        border: 'border-violet-200'
    },
    responding: {
        icon: <MessageSquare size={14} />,
        label: '生成回复',
        bg: 'bg-pink-50',
        text: 'text-pink-600',
        border: 'border-pink-200'
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

    return (
        <div className={`mt-4 mb-6 border rounded-xl overflow-hidden transition-all duration-300 ${collapsed ? 'bg-white border-gray-100' : 'bg-gray-50/50 border-gray-200'}`}>
            {/* 头部 */}
            <div
                className="flex items-center justify-between px-4 py-2 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Brain size={16} className="text-purple-500" />
                    <span>Agent 思考过程</span>
                    {isThinking && (
                        <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
                            思考中...
                        </span>
                    )}
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                    {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
            </div>

            {/* 步骤列表 */}
            {!collapsed && (
                <div className="p-4 space-y-4">
                    {steps.map((step, index) => {
                        const config = STEP_CONFIG[step.type] || STEP_CONFIG.analyzing;
                        return (
                            <div key={step.id} className="relative pl-6">
                                {/* 时间线连接器 */}
                                <div className="absolute left-[3px] top-7 bottom-0 w-0.5 bg-gray-200 -z-10 last:hidden"></div>
                                <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full ${config.text.replace('text-', 'bg-')}`}></div>

                                <div className={`rounded-lg border ${config.bg} ${config.border} p-3`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`${config.text}`}>{config.icon}</span>
                                        <span className={`text-xs font-bold ${config.text} uppercase tracking-wider`}>{config.label}</span>
                                    </div>
                                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{step.content}</div>

                                    {/* SQL 显示 */}
                                    {typeof step.metadata?.sql === 'string' && (
                                        <div className="mt-2 bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-300 overflow-x-auto">
                                            {step.metadata.sql}
                                        </div>
                                    )}

                                    {/* Tool Call Params 显示 */}
                                    {typeof step.metadata?.tool === 'string' && step.metadata?.params && (
                                        <div className="mt-2 bg-white/50 rounded-lg p-2 text-xs font-mono text-gray-600 border border-black/5 overflow-x-auto">
                                            <div className="text-[10px] text-gray-400 mb-1">PARAMS:</div>
                                            {JSON.stringify(step.metadata.params, null, 2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* 思考中的占位 */}
                    {isThinking && (
                        <div className="relative pl-6">
                            <div className="absolute left-[3px] top-0 bottom-0 w-0.5 bg-gray-200 -z-10"></div>
                            <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-purple-400 animate-ping"></div>

                            <div className="flex gap-1 h-6 items-center px-4 bg-white border border-gray-200 rounded-lg w-fit">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
