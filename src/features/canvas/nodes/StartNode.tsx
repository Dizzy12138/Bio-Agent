import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import type { StartNodeData } from '../../../types';
import './nodes.css';

export const StartNode: React.FC<NodeProps> = memo(({ data, selected }) => {
    const nodeData = data as StartNodeData;

    return (
        <div className={`custom-node start-node ${selected ? 'selected' : ''}`}>
            <div className="node-header start-header">
                <div className="node-icon">
                    <Play size={16} />
                </div>
                <span className="node-title">{nodeData.label || '开始'}</span>
            </div>

            <div className="node-content">
                <div className="node-info">
                    <span className="info-label">触发方式</span>
                    <span className="info-value">
                        {nodeData.triggerType === 'manual' && '手动触发'}
                        {nodeData.triggerType === 'scheduled' && '定时触发'}
                        {nodeData.triggerType === 'api' && 'API调用'}
                    </span>
                </div>

                {nodeData.inputVariables && nodeData.inputVariables.length > 0 && (
                    <div className="node-variables">
                        <span className="variables-label">输入变量</span>
                        <div className="variables-list">
                            {nodeData.inputVariables.slice(0, 3).map((variable) => (
                                <span key={variable.id} className="variable-tag">
                                    {variable.name}
                                    {variable.required && <span className="required-mark">*</span>}
                                </span>
                            ))}
                            {nodeData.inputVariables.length > 3 && (
                                <span className="variable-more">+{nodeData.inputVariables.length - 3}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="node-handle source-handle"
            />
        </div>
    );
});

StartNode.displayName = 'StartNode';
