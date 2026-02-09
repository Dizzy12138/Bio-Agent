import React from 'react';
import type { Node } from '@xyflow/react';
import { X } from 'lucide-react';
import { Button, Input, TextArea, Select } from '../../../components/common';
import { useWorkflowStore } from '../../../stores';
import type {
    CustomNodeData,
    StartNodeData,
    LLMNodeData,
    ToolNodeData,
    RouterNodeData,
    OutputNodeData
} from '../../../types';
import './NodeConfigPanel.css';

interface NodeConfigPanelProps {
    node: Node<CustomNodeData>;
    onClose: () => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose }) => {
    const { updateNode, removeNode } = useWorkflowStore();

    const handleUpdate = (updates: Partial<CustomNodeData>) => {
        updateNode(node.id, updates);
    };

    const handleDelete = () => {
        removeNode(node.id);
        onClose();
    };

    const renderConfigFields = () => {
        switch (node.type) {
            case 'start':
                return <StartNodeConfig data={node.data as StartNodeData} onUpdate={handleUpdate} />;
            case 'llm':
                return <LLMNodeConfig data={node.data as LLMNodeData} onUpdate={handleUpdate} />;
            case 'tool':
                return <ToolNodeConfig data={node.data as ToolNodeData} onUpdate={handleUpdate} />;
            case 'router':
                return <RouterNodeConfig data={node.data as RouterNodeData} onUpdate={handleUpdate} />;
            case 'output':
                return <OutputNodeConfig data={node.data as OutputNodeData} onUpdate={handleUpdate} />;
            default:
                return <p>未知节点类型</p>;
        }
    };

    return (
        <div className="node-config-panel">
            <div className="config-header">
                <h3>节点配置</h3>
                <button className="close-btn" onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            <div className="config-body">
                <Input
                    label="节点名称"
                    value={(node.data as { label?: string }).label || ''}
                    onChange={(e) => handleUpdate({ label: e.target.value } as Partial<CustomNodeData>)}
                />

                <div className="config-section">
                    {renderConfigFields()}
                </div>
            </div>

            <div className="config-footer">
                <Button variant="danger" size="sm" onClick={handleDelete}>
                    删除节点
                </Button>
            </div>
        </div>
    );
};

// Start Node Config
const StartNodeConfig: React.FC<{
    data: StartNodeData;
    onUpdate: (updates: Partial<StartNodeData>) => void;
}> = ({ data, onUpdate }) => {
    return (
        <>
            <Select
                label="触发方式"
                value={data.triggerType}
                onChange={(value) => onUpdate({ triggerType: value as StartNodeData['triggerType'] })}
                options={[
                    { value: 'manual', label: '手动触发' },
                    { value: 'scheduled', label: '定时触发' },
                    { value: 'api', label: 'API调用' },
                ]}
            />
            <div className="variables-section">
                <label className="section-label">输入变量</label>
                <p className="section-hint">定义Agent启动时需要的输入参数</p>
                {/* TODO: 变量编辑器 */}
                <Button variant="secondary" size="sm">
                    + 添加变量
                </Button>
            </div>
        </>
    );
};

// LLM Node Config
const LLMNodeConfig: React.FC<{
    data: LLMNodeData;
    onUpdate: (updates: Partial<LLMNodeData>) => void;
}> = ({ data, onUpdate }) => {
    const [modelOptions, setModelOptions] = React.useState<{ value: string; label: string }[]>([]);

    React.useEffect(() => {
        const loadModels = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';
                const resp = await fetch(`${apiBase}/api/v1/config/providers`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                });
                if (resp.ok) {
                    const providers = await resp.json();
                    const options: { value: string; label: string }[] = [];
                    for (const p of providers) {
                        if (p.isEnabled && p.models?.length) {
                            for (const m of p.models) {
                                options.push({ value: m, label: `${p.name} / ${m}` });
                            }
                        }
                    }
                    if (options.length > 0) {
                        setModelOptions(options);
                    }
                }
            } catch { /* 静默失败，使用空列表 */ }
        };
        loadModels();
    }, []);

    // 如果 API 没返回模型，至少显示当前选择的模型
    const finalOptions = modelOptions.length > 0
        ? modelOptions
        : data.model
            ? [{ value: data.model, label: data.model }]
            : [];

    return (
        <>
            <Select
                label="模型选择"
                value={data.model}
                onChange={(value) => onUpdate({ model: value as LLMNodeData['model'] })}
                options={finalOptions}
            />
            <TextArea
                label="系统提示词"
                value={data.systemPrompt}
                onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
                placeholder="输入系统提示词，定义Agent的角色和行为..."
                rows={4}
            />
            <TextArea
                label="用户提示词模板"
                value={data.userPromptTemplate}
                onChange={(e) => onUpdate({ userPromptTemplate: e.target.value })}
                placeholder="使用 {{变量名}} 引用前序节点的输出..."
                rows={3}
                helperText="支持变量引用语法：{{user_query}}, {{db_results}}"
            />
            <div className="params-row">
                <Input
                    label="温度"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={data.temperature}
                    onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
                />
                <Input
                    label="最大Token"
                    type="number"
                    min={1}
                    max={8192}
                    value={data.maxTokens}
                    onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) })}
                />
            </div>
        </>
    );
};

// Tool Node Config
const ToolNodeConfig: React.FC<{
    data: ToolNodeData;
    onUpdate: (updates: Partial<ToolNodeData>) => void;
}> = ({ data, onUpdate }) => {
    return (
        <>
            <Select
                label="选择工具"
                value={data.toolId}
                onChange={(value) => onUpdate({ toolId: value })}
                options={[
                    { value: '', label: '-- 请选择 --' },
                    { value: 'search_polymer_db', label: '高分子材料数据库查询' },
                    { value: 'retrieve_literature', label: '文献检索 (RAG)' },
                    { value: 'predict_toxicity', label: '毒性预测模型' },
                    { value: 'calculate_properties', label: '理化性质计算' },
                ]}
            />
            <Input
                label="工具名称"
                value={data.toolName}
                onChange={(e) => onUpdate({ toolName: e.target.value })}
                placeholder="例如：search_polymer_db"
            />
            <TextArea
                label="工具描述"
                value={data.toolDescription}
                onChange={(e) => onUpdate({ toolDescription: e.target.value })}
                placeholder="描述工具的功能和用途..."
                rows={2}
            />
            <div className="mapping-section">
                <label className="section-label">参数映射</label>
                <p className="section-hint">将前序节点的输出映射到工具参数</p>
                {/* TODO: 参数映射编辑器 */}
            </div>
        </>
    );
};

// Router Node Config
const RouterNodeConfig: React.FC<{
    data: RouterNodeData;
    onUpdate: (updates: Partial<RouterNodeData>) => void;
}> = ({ data, onUpdate }) => {
    return (
        <>
            <Select
                label="路由策略"
                value={data.routingStrategy}
                onChange={(value) => onUpdate({ routingStrategy: value as RouterNodeData['routingStrategy'] })}
                options={[
                    { value: 'intent', label: '意图识别' },
                    { value: 'condition', label: '条件判断' },
                    { value: 'llm', label: 'LLM智能路由' },
                ]}
            />
            <div className="routes-section">
                <label className="section-label">路由分支</label>
                <p className="section-hint">定义不同条件下的流转目标</p>
                {/* TODO: 路由编辑器 */}
                <Button variant="secondary" size="sm">
                    + 添加分支
                </Button>
            </div>
        </>
    );
};

// Output Node Config
const OutputNodeConfig: React.FC<{
    data: OutputNodeData;
    onUpdate: (updates: Partial<OutputNodeData>) => void;
}> = ({ data, onUpdate }) => {
    return (
        <>
            <Select
                label="输出类型"
                value={data.outputType}
                onChange={(value) => onUpdate({ outputType: value as OutputNodeData['outputType'] })}
                options={[
                    { value: 'text', label: '纯文本' },
                    { value: 'markdown', label: 'Markdown' },
                    { value: 'json', label: 'JSON' },
                    { value: 'generative-ui', label: '生成式UI' },
                ]}
            />
            {data.outputType === 'generative-ui' && (
                <div className="ui-components-section">
                    <label className="section-label">UI组件配置</label>
                    <p className="section-hint">配置生成式UI组件（表格、图表等）</p>
                    {/* TODO: UI组件配置器 */}
                </div>
            )}
            <TextArea
                label="输出模板"
                value={data.template || ''}
                onChange={(e) => onUpdate({ template: e.target.value })}
                placeholder="使用 {{变量名}} 引用数据..."
                rows={3}
            />
        </>
    );
};
