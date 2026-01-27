/**
 * MCPConfigPanel Component
 * 
 * Settings panel for managing MCP tools:
 * - View available tools
 * - Enable/disable tools
 * - Configure tool settings
 */

import React, { useState } from 'react';
import {
    getAllTools,
    updateToolConfig,
    resetToolConfig,
    SYSTEM_MCP_TOOLS,
} from '../registry';
import type { MCPTool, MCPToolConfigField } from '../types';
import { Power, RotateCcw, Check, Zap, Settings } from 'lucide-react';
import './MCPConfigPanel.css';

export const MCPConfigPanel: React.FC = () => {
    // 使用 useState 初始化函数直接加载工具，避免 useEffect 中的 setState
    const [tools, setTools] = useState<MCPTool[]>(() => getAllTools());
    const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
    const [editingConfig, setEditingConfig] = useState<Record<string, unknown>>({});
    const [hasChanges, setHasChanges] = useState(false);

    const selectedTool = tools.find(t => t.id === selectedToolId);

    const handleToolSelect = (toolId: string) => {
        if (hasChanges) {
            if (!confirm('有未保存的更改，确定要切换吗？')) return;
        }
        const tool = tools.find(t => t.id === toolId);
        if (tool) {
            setSelectedToolId(toolId);
            setEditingConfig({ ...tool.config });
            setHasChanges(false);
        }
    };

    const handleToggleEnabled = (toolId: string) => {
        const tool = tools.find(t => t.id === toolId);
        if (tool) {
            updateToolConfig(toolId, tool.config, !tool.enabled);
            setTools(getAllTools());
        }
    };

    const handleConfigChange = (key: string, value: unknown) => {
        setEditingConfig(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        if (selectedTool) {
            updateToolConfig(selectedTool.id, editingConfig, selectedTool.enabled);
            setTools(getAllTools());
            setHasChanges(false);
            alert('配置已保存！');
        }
    };

    const handleReset = () => {
        if (selectedTool && confirm('确定要重置为默认配置吗？')) {
            resetToolConfig(selectedTool.id);
            setTools(getAllTools());
            const defaultTool = SYSTEM_MCP_TOOLS.find(t => t.id === selectedTool.id);
            if (defaultTool) {
                setEditingConfig({ ...defaultTool.config });
            }
            setHasChanges(false);
        }
    };

    const renderConfigField = (field: MCPToolConfigField) => {
        const value = editingConfig[field.key] ?? field.default ?? '';

        switch (field.type) {
            case 'text':
            case 'password':
                return (
                    <input
                        type={field.type}
                        value={value as string}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="config-input"
                    />
                );
            case 'number':
                return (
                    <input
                        type="number"
                        value={value as number}
                        onChange={(e) => handleConfigChange(field.key, Number(e.target.value))}
                        placeholder={field.placeholder}
                        className="config-input"
                    />
                );
            case 'boolean':
                return (
                    <label className="config-checkbox">
                        <input
                            type="checkbox"
                            checked={value as boolean}
                            onChange={(e) => handleConfigChange(field.key, e.target.checked)}
                        />
                        <span>启用</span>
                    </label>
                );
            case 'select':
                return (
                    <select
                        value={value as string}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        className="config-select"
                    >
                        {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );
            default:
                return null;
        }
    };

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            ocr: '文档处理',
            database: '数据库',
            knowledge: '知识库',
            chart: '图表',
            custom: '自定义',
        };
        return labels[category] || category;
    };

    return (
        <div className="mcp-config-panel">
            {/* Tool List */}
            <div className="tool-list">
                <div className="tool-list-header">
                    <h3>🔌 MCP 工具</h3>
                    <span className="tool-count">
                        {tools.filter(t => t.enabled).length} / {tools.length} 启用
                    </span>
                </div>
                <div className="tool-items">
                    {tools.map(tool => (
                        <div
                            key={tool.id}
                            className={`tool-item ${selectedToolId === tool.id ? 'selected' : ''} ${tool.enabled ? 'enabled' : 'disabled'}`}
                            onClick={() => handleToolSelect(tool.id)}
                        >
                            <span className="tool-icon">{tool.icon}</span>
                            <div className="tool-info">
                                <span className="tool-name">{tool.name}</span>
                                <span className="tool-category">{getCategoryLabel(tool.category)}</span>
                            </div>
                            <button
                                className={`toggle-btn ${tool.enabled ? 'on' : 'off'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleEnabled(tool.id);
                                }}
                                title={tool.enabled ? '禁用' : '启用'}
                            >
                                <Power size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tool Config */}
            <div className="tool-config">
                {selectedTool ? (
                    <>
                        <div className="config-header">
                            <div className="config-title">
                                <span className="config-icon">{selectedTool.icon}</span>
                                <h3>{selectedTool.name}</h3>
                                {selectedTool.enabled && <Zap size={16} className="status-enabled" />}
                            </div>
                            <p className="config-description">{selectedTool.description}</p>
                        </div>

                        <div className="config-form">
                            {selectedTool.configSchema.map(field => (
                                <div key={field.key} className="config-field">
                                    <label>
                                        {field.label}
                                        {field.required && <span className="required">*</span>}
                                    </label>
                                    {renderConfigField(field)}
                                </div>
                            ))}
                        </div>

                        <div className="config-actions">
                            <button className="btn btn-secondary" onClick={handleReset}>
                                <RotateCcw size={14} />
                                重置默认
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={!hasChanges}
                            >
                                <Check size={14} />
                                保存配置
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="config-placeholder">
                        <Settings size={48} />
                        <p>选择左侧工具进行配置</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MCPConfigPanel;
