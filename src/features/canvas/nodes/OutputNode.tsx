import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Send, Table, BarChart3 } from 'lucide-react';
import type { OutputNodeData } from '../../../types';
import './nodes.css';

export const OutputNode: React.FC<NodeProps> = memo(({ data, selected }) => {
    const nodeData = data as OutputNodeData;

    const getOutputTypeIcon = (type: string) => {
        switch (type) {
            case 'table':
                return <Table size={14} />;
            case 'chart':
                return <BarChart3 size={14} />;
            default:
                return null;
        }
    };

    const getOutputTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'text': '纯文本',
            'markdown': 'Markdown',
            'json': 'JSON',
            'generative-ui': '生成式UI',
        };
        return labels[type] || type;
    };

    return (
        <div className={`custom-node output-node ${selected ? 'selected' : ''}`}>
            <Handle
                type="target"
                position={Position.Left}
                className="node-handle target-handle"
            />

            <div className="node-header output-header">
                <div className="node-icon">
                    <Send size={16} />
                </div>
                <span className="node-title">{nodeData.label || '输出'}</span>
            </div>

            <div className="node-content">
                <div className="node-info">
                    <span className="info-label">输出类型</span>
                    <span className="info-value output-type">
                        {getOutputTypeLabel(nodeData.outputType)}
                    </span>
                </div>

                {nodeData.outputType === 'generative-ui' && nodeData.uiComponents && (
                    <div className="ui-components-preview">
                        <span className="components-label">UI组件</span>
                        <div className="components-list">
                            {nodeData.uiComponents.map((component, index) => (
                                <span key={index} className="component-tag">
                                    {getOutputTypeIcon(component.type)}
                                    {component.type}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {nodeData.template && (
                    <div className="template-preview">
                        <span className="template-label">模板</span>
                        <p className="template-text">
                            {nodeData.template.slice(0, 50)}
                            {nodeData.template.length > 50 && '...'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
});

OutputNode.displayName = 'OutputNode';
