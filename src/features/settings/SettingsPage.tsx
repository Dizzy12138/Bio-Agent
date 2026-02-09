import React, { useState, useEffect } from 'react';
import { Button, useToast, Modal } from '../../components/common';
import { Plus, Trash2, Bot, Zap, Palette, Server, Shield, Settings, Users, MessageSquare, Eye, EyeOff, CheckCircle, XCircle, Loader, Star, Globe } from 'lucide-react';
import { AgentConfigPanel } from '../experts';
import { MCPConfigPanel } from '../mcp';
import { UserManagement, ConversationManager } from './components';
import './SettingsPage.css';

import {
    getFallbackModels,
    fetchAvailableModels,
    LLM_PROVIDERS,
    type LLMConfig,
    type ModelInfo
} from '../bioextract/api/llmService';

interface LLMProvider {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    models: string[];
    isEnabled: boolean;
}

interface SystemSettingsData {
    id: string;
    defaultProviderId: string | null;
    defaultModel: string | null;
    paperApiBaseUrl: string | null;
    paperApiToken: string | null;
}

export const SettingsPage: React.FC = () => {
    const { success, error } = useToast();

    // Load active tab from localStorage or default to 'agents'
    const [activeTab, setActiveTab] = useState<'agents' | 'mcp' | 'models' | 'users' | 'conversations' | 'theme' | 'system'>(() => {
        return (localStorage.getItem('settings_active_tab') as any) || 'agents';
    });

    // Save active tab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('settings_active_tab', activeTab);
    }, [activeTab]);

    // LLM Provider Logic
    const [providers, setProviders] = useState<LLMProvider[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // System Settings (default model)
    const [systemSettings, setSystemSettings] = useState<SystemSettingsData>({
        id: 'system_settings',
        defaultProviderId: null,
        defaultModel: null,
        paperApiBaseUrl: null,
        paperApiToken: null,
    });

    useEffect(() => {
        if (activeTab === 'models' || activeTab === 'system') {
            fetchProviders();
            fetchSystemSettings();
        }
    }, [activeTab]);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/config/providers');
            if (res.ok) {
                const data = await res.json();
                setProviders(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemSettings = async () => {
        try {
            const res = await fetch('/api/v1/config/settings');
            if (res.ok) {
                const data = await res.json();
                setSystemSettings(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const saveDefaultModel = async (providerId: string, model: string) => {
        try {
            const res = await fetch('/api/v1/config/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    defaultProviderId: providerId,
                    defaultModel: model,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setSystemSettings(data);
                success('默认模型已更新');
            } else {
                error('保存失败');
            }
        } catch {
            error('网络错误');
        }
    };

    // Advanced Modal State
    const [config, setConfig] = useState<LLMConfig>({
        provider: 'openai',
        apiKey: '',
        baseUrl: '',
        model: '',
        temperature: 0.7,
        maxTokens: 4096,
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);

    // Load available models when API Key changes
    useEffect(() => {
        if (showAddModal && config.apiKey) {
            const timer = setTimeout(loadModels, 500);
            return () => clearTimeout(timer);
        }
    }, [config.apiKey, config.provider, config.baseUrl, showAddModal]);

    const loadModels = async () => {
        if (!config.apiKey) return;
        setLoadingModels(true);
        try {
            const models = await fetchAvailableModels(config.provider, config.apiKey, config.baseUrl);
            if (models.length > 0) {
                setAvailableModels(models);
                if (!models.find(m => m.id === config.model)) {
                    setConfig(prev => ({ ...prev, model: models[0].id }));
                }
            } else {
                const fallback = getFallbackModels(config.provider);
                setAvailableModels(fallback.map(id => ({ id, name: id })));
            }
        } catch (e) {
            console.error(e);
            const fallback = getFallbackModels(config.provider);
            setAvailableModels(fallback.map(id => ({ id, name: id })));
        } finally {
            setLoadingModels(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const { callLLM } = await import('../bioextract/api/llmService');
            const response = await callLLM(config, [
                { role: 'user', content: 'Say "Connection Successful"' }
            ]);
            if (response.content) {
                setTestResult({ success: true, message: '连接成功！' });
            }
        } catch (e) {
            setTestResult({ success: false, message: `连接失败: ${e instanceof Error ? e.message : '未知错误'}` });
        } finally {
            setTesting(false);
        }
    };

    const handleAdd = async () => {
        if (!config.apiKey) return;

        const providerInfo = LLM_PROVIDERS.find(p => p.id === config.provider);
        const newProvider: LLMProvider = {
            id: `provider-${Date.now()}`,
            name: providerInfo?.name || config.provider,
            baseUrl: config.baseUrl || providerInfo?.defaultBaseUrl || '',
            apiKey: config.apiKey,
            models: availableModels.map(m => m.id),
            isEnabled: true,
        };

        const payload = {
            ...newProvider,
            createdAt: new Date().toISOString()
        };

        try {
            const res = await fetch('/api/v1/config/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowAddModal(false);
                resetModalState();
                fetchProviders();
                success('添加模型服务成功');
            } else {
                error('添加失败');
            }
        } catch {
            error('网络错误');
        }
    };

    const resetModalState = () => {
        setConfig({
            provider: 'openai',
            apiKey: '',
            baseUrl: '',
            model: '',
            temperature: 0.7,
            maxTokens: 4096,
        });
        setShowApiKey(false);
        setTesting(false);
        setTestResult(null);
        setAvailableModels([]);
        setLoadingModels(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定删除该配置吗？')) return;

        try {
            await fetch(`/api/v1/config/providers/${id}`, { method: 'DELETE' });
            fetchProviders();
            success('删除成功');

            // If deleted provider was the default, clear default
            if (systemSettings.defaultProviderId === id) {
                saveDefaultModel('', '');
            }
        } catch (err) {
            console.error(err);
            error('删除失败');
        }
    };

    const menuItems = [
        {
            id: 'agents',
            label: 'Agent 管理',
            desc: '自定义 AI 助手的行为与角色',
            icon: <Bot size={20} />
        },
        {
            id: 'mcp',
            label: 'MCP 工具',
            desc: '集成外部工具与数据源',
            icon: <Zap size={20} />
        },
        {
            id: 'models',
            label: '模型服务',
            desc: '配置 LLM 服务的连接参数',
            icon: <Server size={20} />
        },
        {
            id: 'users',
            label: '用户管理',
            desc: '管理系统用户和权限',
            icon: <Users size={20} />
        },
        {
            id: 'conversations',
            label: '对话记录',
            desc: '查看和管理所有对话',
            icon: <MessageSquare size={20} />
        },
        {
            id: 'theme',
            label: '主题设置',
            desc: '个性化界面外观',
            icon: <Palette size={20} />
        },
        {
            id: 'system',
            label: '系统配置',
            desc: '外部服务与运行参数',
            icon: <Globe size={20} />
        },
    ] as const;

    const getActiveTitle = () => {
        const item = menuItems.find(i => i.id === activeTab);
        return item ? (
            <>
                {item.icon}
                {item.label}
            </>
        ) : '设置';
    };

    // Build flat list of all models grouped by provider for default model selector
    const allProviderModels = providers
        .filter(p => p.isEnabled)
        .flatMap(p => p.models.map(m => ({ providerId: p.id, providerName: p.name, model: m })));

    return (
        <div className="settings-manager">
            {/* Sidebar Navigation */}
            <aside className="settings-sidebar">
                <div className="settings-sidebar-header">
                    <h2 className="settings-sidebar-title">
                        <Settings size={20} />
                        系统设置
                    </h2>
                </div>

                <div className="settings-nav-list">
                    {menuItems.map(item => (
                        <div
                            key={item.id}
                            className={`settings-nav-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id as any)}
                        >
                            <div className="settings-nav-icon">
                                {item.icon}
                            </div>
                            <div className="settings-nav-info">
                                <div className="settings-nav-label">{item.label}</div>
                                <div className="settings-nav-desc">{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="settings-main">
                <div className="settings-content-header">
                    <h1 className="settings-content-title">
                        {getActiveTitle()}
                    </h1>
                    {activeTab === 'models' && (
                        <Button onClick={() => { resetModalState(); setShowAddModal(true); }} leftIcon={<Plus size={16} />}>
                            添加服务
                        </Button>
                    )}
                </div>

                <div className="settings-content-body fade-in-up">
                    {activeTab === 'agents' && <AgentConfigPanel />}

                    {activeTab === 'mcp' && <MCPConfigPanel />}

                    {activeTab === 'users' && <UserManagement />}

                    {activeTab === 'conversations' && <ConversationManager />}

                    {activeTab === 'models' && (
                        <div style={{ maxWidth: '800px' }}>
                            {/* Default Model Selector */}
                            {providers.length > 0 && (
                                <div className="settings-default-model-section" style={{
                                    marginBottom: '24px',
                                    padding: '20px',
                                    background: 'linear-gradient(135deg, var(--primary-50, #eff6ff) 0%, var(--bg-secondary, #f8fafc) 100%)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--primary-200, #bfdbfe)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <Star size={18} style={{ color: 'var(--primary-500, #3b82f6)' }} />
                                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary, #1e293b)' }}>
                                            默认模型
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                                            (聊天未指定模型时使用)
                                        </span>
                                    </div>
                                    <select
                                        value={
                                            systemSettings.defaultProviderId && systemSettings.defaultModel
                                                ? `${systemSettings.defaultProviderId}|${systemSettings.defaultModel}`
                                                : ''
                                        }
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) {
                                                saveDefaultModel('', '');
                                            } else {
                                                const [pid, ...modelParts] = val.split('|');
                                                saveDefaultModel(pid, modelParts.join('|'));
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color, #e2e8f0)',
                                            background: 'white',
                                            fontSize: '14px',
                                            color: 'var(--text-primary, #1e293b)',
                                            cursor: 'pointer',
                                            outline: 'none',
                                        }}
                                    >
                                        <option value="">未设置（使用第一个可用模型兜底）</option>
                                        {allProviderModels.map(item => (
                                            <option key={`${item.providerId}|${item.model}`} value={`${item.providerId}|${item.model}`}>
                                                {item.providerName} / {item.model}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Provider List */}
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                                    <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-500, #3b82f6)' }} />
                                </div>
                            ) : providers.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '64px 24px',
                                    background: 'var(--bg-secondary, #f8fafc)',
                                    borderRadius: '12px',
                                    border: '2px dashed var(--border-color, #e2e8f0)',
                                }}>
                                    <div style={{
                                        width: '64px', height: '64px',
                                        background: 'var(--bg-tertiary, #f1f5f9)',
                                        borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 16px',
                                        color: 'var(--text-muted, #94a3b8)',
                                    }}>
                                        <Server size={32} />
                                    </div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary, #1e293b)', marginBottom: '4px' }}>暂无模型服务</h3>
                                    <p style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '24px' }}>配置 LLM Provider 以开启 AI 能力</p>
                                    <Button onClick={() => { resetModalState(); setShowAddModal(true); }} leftIcon={<Plus size={16} />} variant="secondary">
                                        添加服务
                                    </Button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '16px' }}>
                                    {providers.map(p => {
                                        const isDefault = systemSettings.defaultProviderId === p.id;
                                        return (
                                            <div key={p.id} style={{
                                                background: 'var(--bg-primary, white)',
                                                border: `1px solid ${isDefault ? 'var(--primary-300, #93c5fd)' : 'var(--border-color, #e2e8f0)'}`,
                                                borderRadius: '12px',
                                                padding: '20px',
                                                transition: 'all 0.2s ease',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                                        <div style={{
                                                            width: '48px', height: '48px',
                                                            borderRadius: '10px',
                                                            background: isDefault ? 'var(--primary-100, #dbeafe)' : 'var(--primary-50, #eff6ff)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: 'var(--primary-600, #2563eb)',
                                                            flexShrink: 0,
                                                        }}>
                                                            <Server size={24} />
                                                        </div>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <h3 style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary, #1e293b)', margin: 0 }}>{p.name}</h3>
                                                                {p.isEnabled && (
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        background: 'var(--success-50, #f0fdf4)',
                                                                        color: 'var(--success-700, #15803d)',
                                                                        fontSize: '11px',
                                                                        fontWeight: 500,
                                                                        borderRadius: '9999px',
                                                                        border: '1px solid var(--success-100, #dcfce7)',
                                                                    }}>
                                                                        已启用
                                                                    </span>
                                                                )}
                                                                {isDefault && (
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        background: 'var(--primary-50, #eff6ff)',
                                                                        color: 'var(--primary-700, #1d4ed8)',
                                                                        fontSize: '11px',
                                                                        fontWeight: 500,
                                                                        borderRadius: '9999px',
                                                                        border: '1px solid var(--primary-100, #dbeafe)',
                                                                    }}>
                                                                        ⭐ 默认
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                                                                <span style={{
                                                                    background: 'var(--bg-tertiary, #f1f5f9)',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '12px',
                                                                    fontFamily: 'monospace',
                                                                }}>{p.baseUrl}</span>
                                                            </div>
                                                            {p.models && p.models.length > 0 && (
                                                                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                    {p.models.slice(0, 6).map(m => (
                                                                        <span key={m} style={{
                                                                            fontSize: '11px',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '4px',
                                                                            background: 'var(--bg-secondary, #f8fafc)',
                                                                            color: 'var(--text-secondary, #64748b)',
                                                                            border: '1px solid var(--border-color, #e2e8f0)',
                                                                        }}>{m}</span>
                                                                    ))}
                                                                    {p.models.length > 6 && (
                                                                        <span style={{
                                                                            fontSize: '11px',
                                                                            padding: '2px 6px',
                                                                            color: 'var(--text-muted, #94a3b8)',
                                                                        }}>+{p.models.length - 6} more</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        style={{
                                                            padding: '8px',
                                                            color: 'var(--text-muted, #94a3b8)',
                                                            background: 'none',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s',
                                                        }}
                                                        title="删除配置"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                                <div style={{
                                                    marginTop: '16px', paddingTop: '12px',
                                                    borderTop: '1px solid var(--border-color, #f1f5f9)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    fontSize: '12px', color: 'var(--text-muted, #94a3b8)',
                                                }}>
                                                    <div style={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Shield size={12} />
                                                        KEY: <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>
                                                            {p.apiKey ? `${p.apiKey.substring(0, 20)}...` : '未设置'}
                                                        </span>
                                                    </div>
                                                    <div style={{ opacity: 0.5 }}>ID: {p.id}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'theme' && (
                        <div style={{
                            height: '100%', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted, #94a3b8)', padding: '48px', textAlign: 'center',
                        }}>
                            <div style={{
                                width: '96px', height: '96px',
                                background: 'var(--bg-secondary, #f8fafc)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '24px',
                            }}>
                                <Palette size={40} style={{ color: 'var(--text-muted, #cbd5e1)' }} />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary, #1e293b)', marginBottom: '8px' }}>主题设置</h3>
                            <p style={{ maxWidth: '320px', margin: '0 auto' }}>个性化主题配置正在开发中...</p>
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div style={{ maxWidth: '700px' }}>
                            {/* 外部论文 API */}
                            <div style={{
                                marginBottom: '24px',
                                padding: '24px',
                                background: 'var(--bg-primary, white)',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color, #e2e8f0)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <Globe size={20} style={{ color: 'var(--primary-500, #3b82f6)' }} />
                                    <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary, #1e293b)' }}>
                                        外部论文 API
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                                        BioExtract 论文解析服务
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{
                                            display: 'block', fontSize: '13px', fontWeight: 500,
                                            color: 'var(--text-secondary, #475569)', marginBottom: '6px'
                                        }}>API 地址</label>
                                        <input
                                            type="text"
                                            value={systemSettings.paperApiBaseUrl || ''}
                                            onChange={(e) => setSystemSettings(prev => ({ ...prev, paperApiBaseUrl: e.target.value || null }))}
                                            placeholder="例: http://matai.zhijiucity.com:36001/api/v1/papers"
                                            style={{
                                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                                border: '1px solid var(--border-color, #e2e8f0)',
                                                background: 'var(--bg-secondary, #f8fafc)',
                                                fontSize: '13px', fontFamily: 'monospace',
                                                color: 'var(--text-primary, #1e293b)',
                                                outline: 'none', boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{
                                            display: 'block', fontSize: '13px', fontWeight: 500,
                                            color: 'var(--text-secondary, #475569)', marginBottom: '6px'
                                        }}>Authorization Token</label>
                                        <input
                                            type="password"
                                            value={systemSettings.paperApiToken || ''}
                                            onChange={(e) => setSystemSettings(prev => ({ ...prev, paperApiToken: e.target.value || null }))}
                                            placeholder="Bearer eyJ..."
                                            style={{
                                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                                border: '1px solid var(--border-color, #e2e8f0)',
                                                background: 'var(--bg-secondary, #f8fafc)',
                                                fontSize: '13px', fontFamily: 'monospace',
                                                color: 'var(--text-primary, #1e293b)',
                                                outline: 'none', boxSizing: 'border-box',
                                            }}
                                        />
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                                            留空则使用环境变量 PAPER_API_TOKEN 的值
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                                        <Button
                                            onClick={async () => {
                                                try {
                                                    const token = localStorage.getItem('auth_token');
                                                    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';
                                                    const resp = await fetch(`${apiBase}/api/v1/config/settings`, {
                                                        method: 'PUT',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                                                        },
                                                        body: JSON.stringify(systemSettings),
                                                    });
                                                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                                                    success('系统配置已保存');
                                                } catch (err: any) {
                                                    error(`保存失败: ${err.message}`);
                                                }
                                            }}
                                            leftIcon={<CheckCircle size={16} />}
                                        >
                                            保存配置
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* 提示信息 */}
                            <div style={{
                                padding: '16px 20px',
                                background: 'linear-gradient(135deg, var(--primary-50, #eff6ff) 0%, var(--bg-secondary, #f8fafc) 100%)',
                                borderRadius: '10px',
                                border: '1px solid var(--primary-100, #dbeafe)',
                                fontSize: '13px',
                                color: 'var(--text-secondary, #475569)',
                                lineHeight: '1.6',
                            }}>
                                <strong>💡 说明：</strong>此处的配置优先于 <code>.env</code> 环境变量。
                                如果某项留空，系统将使用环境变量中的值作为兜底。
                                基础设施配置（数据库、端口等）请直接修改 <code>.env</code> 文件。
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ==================== 添加模型服务模态框 ==================== */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); resetModalState(); }}
                title="添加模型服务"
                size="lg"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => { setShowAddModal(false); resetModalState(); }}
                        >
                            取消
                        </Button>
                        <Button
                            onClick={handleTestConnection}
                            disabled={!config.apiKey || testing}
                            variant="secondary"
                            leftIcon={testing ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : undefined}
                        >
                            {testing ? '测试中...' : '测试连接'}
                        </Button>
                        <Button
                            onClick={handleAdd}
                            disabled={!config.apiKey}
                        >
                            确认添加
                        </Button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Provider Type */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #1e293b)', marginBottom: '6px' }}>
                            服务商类型
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                            {LLM_PROVIDERS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        setConfig(prev => ({
                                            ...prev,
                                            provider: p.id as LLMConfig['provider'],
                                            baseUrl: p.defaultBaseUrl,
                                            model: '',
                                        }));
                                        setAvailableModels([]);
                                        setTestResult(null);
                                    }}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: `2px solid ${config.provider === p.id ? 'var(--primary-500, #3b82f6)' : 'var(--border-color, #e2e8f0)'}`,
                                        background: config.provider === p.id ? 'var(--primary-50, #eff6ff)' : 'white',
                                        color: config.provider === p.id ? 'var(--primary-700, #1d4ed8)' : 'var(--text-secondary, #64748b)',
                                        fontWeight: config.provider === p.id ? 600 : 400,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        textAlign: 'center',
                                    }}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Base URL */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #1e293b)', marginBottom: '6px' }}>
                            API Base URL
                        </label>
                        <input
                            type="text"
                            value={config.baseUrl}
                            onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                            placeholder={LLM_PROVIDERS.find(p => p.id === config.provider)?.defaultBaseUrl || 'https://api.example.com/v1'}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                            第三方 API 请填写对应的 Base URL（如 https://api.deepseek.com/v1）
                        </p>
                    </div>

                    {/* API Key */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #1e293b)', marginBottom: '6px' }}>
                            API Key
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={config.apiKey}
                                onChange={(e) => {
                                    setConfig(prev => ({ ...prev, apiKey: e.target.value }));
                                    setTestResult(null);
                                }}
                                placeholder="sk-..."
                                style={{
                                    width: '100%',
                                    padding: '10px 42px 10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #e2e8f0)',
                                    fontSize: '13px',
                                    fontFamily: 'monospace',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    padding: '4px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted, #94a3b8)',
                                }}
                            >
                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #1e293b)', marginBottom: '6px' }}>
                            可用模型
                            {loadingModels && (
                                <span style={{ marginLeft: '8px', fontWeight: 400, color: 'var(--text-muted, #94a3b8)' }}>
                                    <Loader size={12} style={{ display: 'inline', animation: 'spin 1s linear infinite', verticalAlign: 'middle', marginRight: '4px' }} />
                                    加载中...
                                </span>
                            )}
                        </label>
                        {availableModels.length > 0 ? (
                            <select
                                value={config.model}
                                onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, #e2e8f0)',
                                    fontSize: '13px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            >
                                {availableModels.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}{m.contextLength ? ` (${Math.round(m.contextLength / 1024)}K ctx)` : ''}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div style={{
                                padding: '16px',
                                borderRadius: '8px',
                                background: 'var(--bg-secondary, #f8fafc)',
                                border: '1px dashed var(--border-color, #e2e8f0)',
                                textAlign: 'center',
                                color: 'var(--text-muted, #94a3b8)',
                                fontSize: '13px',
                            }}>
                                {config.apiKey ? '输入 API Key 后自动加载模型列表...' : '请先输入 API Key'}
                            </div>
                        )}
                    </div>

                    {/* Test Result */}
                    {testResult && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            background: testResult.success ? 'var(--success-50, #f0fdf4)' : '#fef2f2',
                            border: `1px solid ${testResult.success ? 'var(--success-200, #bbf7d0)' : '#fecaca'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            color: testResult.success ? 'var(--success-700, #15803d)' : '#dc2626',
                        }}>
                            {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            {testResult.message}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
