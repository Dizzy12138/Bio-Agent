import React, { useState, useEffect } from 'react';
import { Button, useToast, Modal, Input } from '../../components/common';
import { Plus, Trash2, Bot, Zap, Palette, Server, Shield, Settings } from 'lucide-react';
import { AgentConfigPanel } from '../experts';
import { MCPConfigPanel } from '../mcp';
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

export const SettingsPage: React.FC = () => {
    const { success, error } = useToast();

    // Load active tab from localStorage or default to 'agents'
    const [activeTab, setActiveTab] = useState<'agents' | 'mcp' | 'models' | 'theme'>(() => {
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

    useEffect(() => {
        fetchProviders();
    }, []);

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
                fetchProviders();
                success('添加模型服务成功');
            } else {
                error('添加失败');
            }
        } catch (e) {
            error('网络错误');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定删除该配置吗？')) return;

        try {
            await fetch(`/api/v1/config/providers/${id}`, { method: 'DELETE' });
            fetchProviders();
            success('删除成功');
        } catch (e) {
            console.error(e);
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
            id: 'theme',
            label: '主题设置',
            desc: '个性化界面外观',
            icon: <Palette size={20} />
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
                            onClick={() => setActiveTab(item.id)}
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
                        <Button onClick={() => setShowAddModal(true)} leftIcon={<Plus size={16} />}>
                            添加服务
                        </Button>
                    )}
                </div>

                <div className="settings-content-body fade-in-up">
                    {activeTab === 'agents' && <AgentConfigPanel />}

                    {activeTab === 'mcp' && <MCPConfigPanel />}

                    {activeTab === 'models' && (
                        <div className="space-y-4 max-w-3xl">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : providers.length === 0 ? (
                                <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                        <Server size={32} />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">暂无模型服务</h3>
                                    <p className="text-gray-500 mb-6">配置 LLM Provider 以开启 AI 能力</p>
                                    <Button onClick={() => setShowAddModal(true)} leftIcon={<Plus size={16} />} variant="secondary">
                                        添加服务
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {providers.map(p => (
                                        <div key={p.id} className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                        <Server size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold text-lg text-gray-900">{p.name}</h3>
                                                            {p.isEnabled && (
                                                                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100">
                                                                    已启用
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500 font-mono">
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{p.baseUrl}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="删除配置"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                                                <div className="font-mono flex items-center gap-2">
                                                    <Shield size={12} />
                                                    KEY: <span className="text-gray-600 font-medium">{p.apiKey}</span>
                                                </div>
                                                <div className="opacity-50">ID: {p.id}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'theme' && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Palette size={40} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">主题设置</h3>
                            <p className="max-w-xs mx-auto">个性化主题配置正在开发中...</p>
                        </div>
                    )}
                </div>
            </main>

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="添加模型服务"
                size="2xl"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={handleTestConnection}
                            disabled={testing || !config.apiKey}
                        >
                            {testing ? '测试中...' : '测试连接'}
                        </Button>
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>取消</Button>
                        <Button onClick={handleAdd} disabled={!config.apiKey}>保存配置</Button>
                    </>
                }
            >
                <div className="space-y-6">
                    {/* Provider Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">模型提供商</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {LLM_PROVIDERS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setConfig(prev => ({ ...prev, provider: p.id as any, baseUrl: p.defaultBaseUrl }))}
                                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all
                                        ${config.provider === p.id
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-offset-1'
                                            : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">API Key</label>
                        <div className="relative">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                                placeholder="sk-..."
                                value={config.apiKey}
                                onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showApiKey ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">输入 Key 后将自动获取可用模型列表</p>
                    </div>

                    {/* Base URL */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Base URL</label>
                        <input
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                            value={config.baseUrl}
                            onChange={e => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                            placeholder="https://api.openai.com/v1"
                        />
                    </div>

                    {/* Model Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-sm font-bold text-gray-700">默认模型</label>
                            {loadingModels && <span className="text-xs text-blue-500 animate-pulse">正在获取列表...</span>}
                        </div>
                        {availableModels.length > 0 ? (
                            <div className="relative">
                                <select
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white appearance-none"
                                    value={config.model}
                                    onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                                >
                                    {availableModels.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} {m.contextLength ? `(${Math.round(m.contextLength / 1024)}k)` : ''}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    ▼
                                </div>
                            </div>
                        ) : (
                            <input
                                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none"
                                value={config.model}
                                onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                                placeholder="输入模型名称..."
                            />
                        )}
                    </div>

                    {testResult && (
                        <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {testResult.message}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
