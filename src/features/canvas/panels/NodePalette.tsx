import React from 'react';
import { Play, Brain, Wrench, GitBranch, Send } from 'lucide-react';
import './NodePalette.css';

interface NodeTypeItem {
    type: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const nodeTypeList: NodeTypeItem[] = [
    {
        type: 'start',
        label: '开始节点',
        description: '定义Agent的启动方式',
        icon: <Play size={18} />,
        color: 'var(--node-start)',
    },
    {
        type: 'llm',
        label: 'LLM推理',
        description: '大语言模型推理节点',
        icon: <Brain size={18} />,
        color: 'var(--node-llm)',
    },
    {
        type: 'tool',
        label: '科学工具',
        description: '调用数据库、API等工具',
        icon: <Wrench size={18} />,
        color: 'var(--node-tool)',
    },
    {
        type: 'router',
        label: '路由节点',
        description: '意图识别与分支控制',
        icon: <GitBranch size={18} />,
        color: 'var(--node-router)',
    },
    {
        type: 'output',
        label: '输出节点',
        description: '结果呈现与生成式UI',
        icon: <Send size={18} />,
        color: 'var(--node-output)',
    },
];

export const NodePalette: React.FC = () => {
    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="node-palette">
            <div className="palette-header">
                <h3>节点类型</h3>
                <span className="palette-hint">拖拽到画布</span>
            </div>
            <div className="palette-list">
                {nodeTypeList.map((item) => (
                    <div
                        key={item.type}
                        className="palette-item"
                        draggable
                        onDragStart={(e) => onDragStart(e, item.type)}
                    >
                        <div
                            className="palette-icon"
                            style={{ backgroundColor: item.color }}
                        >
                            {item.icon}
                        </div>
                        <div className="palette-info">
                            <span className="palette-label">{item.label}</span>
                            <span className="palette-desc">{item.description}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
