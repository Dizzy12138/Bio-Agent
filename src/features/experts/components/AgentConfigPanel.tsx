/**
 * AgentConfigPanel Component
 * 
 * Panel for viewing and editing system agent configurations,
 * including system prompts and agent-specific settings.
 */

import React, { useState, useEffect } from 'react';
import {
    SYSTEM_AGENTS,
    getAgentPrompt,
    saveAgentPrompt,
    resetAgentPrompt,
} from '../templates';
import type { Expert } from '../types';
import { Save, RotateCcw, ChevronDown, ChevronUp, Settings, FileText } from 'lucide-react';
import './AgentConfigPanel.css';

interface AgentConfigPanelProps {
    selectedAgentId?: string;
    onAgentSelect?: (agentId: string) => void;
}

export const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({
    selectedAgentId,
    onAgentSelect,
}) => {
    const [selectedAgent, setSelectedAgent] = useState<Expert | null>(null);
    const [editedPrompt, setEditedPrompt] = useState('');
    const [isSaved, setIsSaved] = useState(true);
    const [expandedConfig, setExpandedConfig] = useState(false);

    // Initialize with first agent if none selected
    useEffect(() => {
        const agentId = selectedAgentId || SYSTEM_AGENTS[0]?.id;
        if (agentId) {
            const agent = SYSTEM_AGENTS.find(a => a.id === agentId);
            if (agent) {
                setSelectedAgent(agent);
                setEditedPrompt(getAgentPrompt(agentId));
            }
        }
    }, [selectedAgentId]);

    const handleAgentChange = (agentId: string) => {
        const agent = SYSTEM_AGENTS.find(a => a.id === agentId);
        if (agent) {
            // Check for unsaved changes
            if (!isSaved) {
                if (!confirm('有未保存的更改，确定要切换吗？')) return;
            }
            setSelectedAgent(agent);
            setEditedPrompt(getAgentPrompt(agentId));
            setIsSaved(true);
            onAgentSelect?.(agentId);
        }
    };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedPrompt(e.target.value);
        setIsSaved(false);
    };

    const handleSave = () => {
        if (selectedAgent) {
            saveAgentPrompt(selectedAgent.id, editedPrompt);
            setIsSaved(true);
            alert('提示词已保存！下次使用该 Agent 时将生效。');
        }
    };

    const handleReset = () => {
        if (selectedAgent) {
            if (confirm('确定要重置为默认提示词吗？这将删除您的自定义修改。')) {
                resetAgentPrompt(selectedAgent.id);
                setEditedPrompt(selectedAgent.systemPrompt);
                setIsSaved(true);
            }
        }
    };

    if (!selectedAgent) {
        return <div className="agent-config-panel empty">暂无系统 Agent</div>;
    }

    return (
        <div className="agent-config-panel">
            {/* Agent Selector */}
            <div className="agent-selector">
                <label>选择 Agent：</label>
                <select
                    value={selectedAgent.id}
                    onChange={(e) => handleAgentChange(e.target.value)}
                >
                    {SYSTEM_AGENTS.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                            {agent.avatar} {agent.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Agent Info */}
            <div className="agent-info">
                <div className="agent-header">
                    <span className="agent-avatar">{selectedAgent.avatar}</span>
                    <div className="agent-meta">
                        <h3>{selectedAgent.name}</h3>
                        <p>{selectedAgent.description}</p>
                    </div>
                </div>
                <div className="agent-tags">
                    {selectedAgent.capabilities.map((cap) => (
                        <span key={cap} className="tag">{cap}</span>
                    ))}
                </div>
            </div>

            {/* Agent Config */}
            <div className="config-section">
                <div
                    className="config-header"
                    onClick={() => setExpandedConfig(!expandedConfig)}
                >
                    <Settings size={14} />
                    <span>Agent 配置</span>
                    {expandedConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
                {expandedConfig && selectedAgent.agentConfig && (
                    <div className="config-details">
                        <div className="config-item">
                            <label>最大迭代次数：</label>
                            <span>{selectedAgent.agentConfig.maxIterations || 'N/A'}</span>
                        </div>
                        <div className="config-item">
                            <label>温度：</label>
                            <span>{selectedAgent.agentConfig.temperature || 'N/A'}</span>
                        </div>
                        <div className="config-item">
                            <label>工具：</label>
                            <span>{selectedAgent.agentConfig.enableTools ? '启用' : '禁用'}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* System Prompt Editor */}
            <div className="prompt-section">
                <div className="prompt-header">
                    <FileText size={14} />
                    <span>系统提示词</span>
                    {!isSaved && <span className="unsaved-badge">未保存</span>}
                </div>
                <textarea
                    className="prompt-editor"
                    value={editedPrompt}
                    onChange={handlePromptChange}
                    placeholder="输入系统提示词..."
                    rows={15}
                />
                <div className="prompt-actions">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <RotateCcw size={14} />
                        重置默认
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaved}
                    >
                        <Save size={14} />
                        保存修改
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="agent-stats">
                <div className="stat-item">
                    <span className="stat-label">字符数</span>
                    <span className="stat-value">{editedPrompt.length}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">域</span>
                    <span className="stat-value">{selectedAgent.domain}</span>
                </div>
            </div>
        </div>
    );
};

export default AgentConfigPanel;
