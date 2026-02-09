import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Brain, Sparkles } from 'lucide-react';
import type { LLMNodeData } from '../../../types';
import './nodes.css';

export const LLMNode: React.FC<NodeProps> = memo(({ data, selected }) => {
    const nodeData = data as LLMNodeData;

    const getModelDisplayName = (model: string) => {
        return model || '未配置';
    };

    return (
        <div className={`custom-node llm-node ${selected ? 'selected' : ''}`}>
            <Handle
                type="target"
                position={Position.Left}
                className="node-handle target-handle"
            />

            <div className="node-header llm-header">
                <div className="node-icon">
                    <Brain size={16} />
                </div>
                <span className="node-title">{nodeData.label || 'LLM推理'}</span>
                <Sparkles size={12} className="node-badge" />
            </div>

            <div className="node-content">
                <div className="node-info">
                    <span className="info-label">模型</span>
                    <span className="info-value model-value">
                        {getModelDisplayName(nodeData.model)}
                    </span>
                </div>

                {nodeData.categoryBinding && (
                    <div className="node-info">
                        <span className="info-label">分类绑定</span>
                        <span className="info-value category-value">
                            {nodeData.categoryBinding}
                        </span>
                    </div>
                )}

                <div className="node-prompt-preview">
                    <span className="prompt-label">系统提示词</span>
                    <p className="prompt-text">
                        {nodeData.systemPrompt?.slice(0, 60) || '未配置'}
                        {nodeData.systemPrompt && nodeData.systemPrompt.length > 60 && '...'}
                    </p>
                </div>

                <div className="node-params">
                    <span className="param-item">
                        温度: {nodeData.temperature ?? 0.7}
                    </span>
                    <span className="param-item">
                        最大Token: {nodeData.maxTokens ?? 2048}
                    </span>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="node-handle source-handle"
            />
        </div>
    );
});

LLMNode.displayName = 'LLMNode';
