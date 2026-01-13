import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch, Route } from 'lucide-react';
import type { RouterNodeData } from '../../../types';
import './nodes.css';

export const RouterNode: React.FC<NodeProps> = memo(({ data, selected }) => {
    const nodeData = data as RouterNodeData;

    const getStrategyLabel = (strategy: string) => {
        const labels: Record<string, string> = {
            'intent': '意图识别',
            'condition': '条件判断',
            'llm': 'LLM路由',
        };
        return labels[strategy] || strategy;
    };

    return (
        <div className={`custom-node router-node ${selected ? 'selected' : ''}`}>
            <Handle
                type="target"
                position={Position.Left}
                className="node-handle target-handle"
            />

            <div className="node-header router-header">
                <div className="node-icon">
                    <GitBranch size={16} />
                </div>
                <span className="node-title">{nodeData.label || '路由'}</span>
            </div>

            <div className="node-content">
                <div className="node-info">
                    <span className="info-label">路由策略</span>
                    <span className="info-value">
                        {getStrategyLabel(nodeData.routingStrategy)}
                    </span>
                </div>

                {nodeData.routes && nodeData.routes.length > 0 && (
                    <div className="router-routes">
                        <span className="routes-label">
                            <Route size={12} /> 路由分支
                        </span>
                        <div className="routes-list">
                            {nodeData.routes.map((route, index) => (
                                <div key={route.id} className="route-item">
                                    <span className="route-index">{index + 1}</span>
                                    <span className="route-condition">
                                        {route.label || route.condition.slice(0, 20)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 多个输出Handle */}
            {nodeData.routes && nodeData.routes.map((route, index) => (
                <Handle
                    key={route.id}
                    type="source"
                    position={Position.Right}
                    id={route.id}
                    className="node-handle source-handle router-handle"
                    style={{ top: `${30 + index * 24}%` }}
                />
            ))}

            {/* 默认输出 */}
            <Handle
                type="source"
                position={Position.Right}
                id="default"
                className="node-handle source-handle"
                style={{ top: '85%' }}
            />
        </div>
    );
});

RouterNode.displayName = 'RouterNode';
