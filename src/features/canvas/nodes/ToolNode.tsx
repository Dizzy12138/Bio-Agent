import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Wrench, Database, FlaskConical } from 'lucide-react';
import type { ToolNodeData } from '../../../types';
import './nodes.css';

export const ToolNode: React.FC<NodeProps> = memo(({ data, selected }) => {
    const nodeData = data as ToolNodeData;

    const getToolIcon = (toolId: string) => {
        if (toolId.includes('database') || toolId.includes('polymer')) {
            return <Database size={16} />;
        }
        if (toolId.includes('experiment') || toolId.includes('lab')) {
            return <FlaskConical size={16} />;
        }
        return <Wrench size={16} />;
    };

    const mappingCount = Object.keys(nodeData.parameterMappings || {}).length;

    return (
        <div className={`custom-node tool-node ${selected ? 'selected' : ''}`}>
            <Handle
                type="target"
                position={Position.Left}
                className="node-handle target-handle"
            />

            <div className="node-header tool-header">
                <div className="node-icon">
                    {getToolIcon(nodeData.toolId)}
                </div>
                <span className="node-title">{nodeData.label || '科学工具'}</span>
            </div>

            <div className="node-content">
                <div className="tool-name">
                    <span className="tool-name-label">{nodeData.toolName || 'search_polymer_db'}</span>
                </div>

                {nodeData.toolDescription && (
                    <p className="tool-description">
                        {nodeData.toolDescription.slice(0, 80)}
                        {nodeData.toolDescription.length > 80 && '...'}
                    </p>
                )}

                {mappingCount > 0 && (
                    <div className="node-info">
                        <span className="info-label">参数映射</span>
                        <span className="info-value">{mappingCount} 个参数</span>
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

ToolNode.displayName = 'ToolNode';
