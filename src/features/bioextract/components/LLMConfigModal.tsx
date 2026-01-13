/**
 * LLM 配置弹窗组件
 * 支持动态获取模型列表
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    getLLMConfig,
    saveLLMConfig,
    LLM_PROVIDERS,
    fetchAvailableModels,
    getFallbackModels,
    type LLMConfig,
    type ModelInfo,
} from '../api/llmService';
import './LLMConfigModal.css';

interface LLMConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: LLMConfig) => void;
}

export const LLMConfigModal: React.FC<LLMConfigModalProps> = ({ isOpen, onClose, onSave }) => {
    const [config, setConfig] = useState<LLMConfig>({
        provider: 'openai',
        apiKey: '',
        baseUrl: '',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
    });

    const [showApiKey, setShowApiKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // 动态模型列表
    const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);

    // 加载已保存的配置
    useEffect(() => {
        if (isOpen) {
            const savedConfig = getLLMConfig();
            if (savedConfig) {
                setConfig(savedConfig);
            }
        }
    }, [isOpen]);

    // 获取当前提供商的信息
    const currentProvider = LLM_PROVIDERS.find(p => p.id === config.provider);

    // 动态获取模型列表
    const loadModels = useCallback(async () => {
        if (!config.apiKey) {
            // 没有 API Key，使用后备列表
            const fallback = getFallbackModels(config.provider);
            setAvailableModels(fallback.map(id => ({ id, name: id })));
            return;
        }

        setLoadingModels(true);
        setModelsError(null);

        try {
            const models = await fetchAvailableModels(
                config.provider,
                config.apiKey,
                config.baseUrl || undefined
            );

            if (models.length > 0) {
                setAvailableModels(models);
                // 如果当前选中的模型不在列表中，选择第一个
                if (!models.find(m => m.id === config.model)) {
                    setConfig(prev => ({ ...prev, model: models[0].id }));
                }
            } else {
                // 获取失败，使用后备列表
                const fallback = getFallbackModels(config.provider);
                setAvailableModels(fallback.map(id => ({ id, name: id })));
                setModelsError('无法获取模型列表，已使用默认列表');
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            const fallback = getFallbackModels(config.provider);
            setAvailableModels(fallback.map(id => ({ id, name: id })));
            setModelsError('获取模型列表失败');
        }

        setLoadingModels(false);
    }, [config.provider, config.apiKey, config.baseUrl, config.model]);

    // API Key 或提供商变化时，尝试加载模型列表
    useEffect(() => {
        if (isOpen && config.apiKey) {
            // 延迟加载，避免输入过程中频繁请求
            const timer = setTimeout(loadModels, 500);
            return () => clearTimeout(timer);
        } else {
            // 没有 API Key，使用后备列表
            const fallback = getFallbackModels(config.provider);
            setAvailableModels(fallback.map(id => ({ id, name: id })));
        }
    }, [isOpen, config.provider, config.apiKey, config.baseUrl, loadModels]);

    // 处理提供商切换
    const handleProviderChange = (providerId: string) => {
        const provider = LLM_PROVIDERS.find(p => p.id === providerId);
        if (provider) {
            const fallback = provider.fallbackModels;
            setConfig(prev => ({
                ...prev,
                provider: providerId as LLMConfig['provider'],
                baseUrl: provider.defaultBaseUrl,
                model: fallback[0] || '',
            }));
            setAvailableModels(fallback.map(id => ({ id, name: id })));
            setModelsError(null);
        }
    };

    // 手动刷新模型列表
    const handleRefreshModels = () => {
        if (config.apiKey) {
            loadModels();
        }
    };

    // 测试连接
    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            const { callLLM } = await import('../api/llmService');
            const response = await callLLM(config, [
                { role: 'system', content: '你是一个助手。' },
                { role: 'user', content: '请回复"连接成功"四个字。' },
            ]);

            if (response.content) {
                setTestResult({ success: true, message: `✅ 连接成功！响应: "${response.content.slice(0, 50)}..."` });
            } else {
                setTestResult({ success: false, message: '❌ 响应为空' });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: `❌ 连接失败: ${error instanceof Error ? error.message : '未知错误'}`
            });
        }

        setTesting(false);
    };

    // 保存配置
    const handleSave = () => {
        saveLLMConfig(config);
        onSave(config);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="llm-config-overlay" onClick={onClose}>
            <div className="llm-config-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>🤖 LLM 模型配置</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </header>

                <div className="modal-body">
                    {/* 提供商选择 */}
                    <div className="form-group">
                        <label>模型提供商</label>
                        <div className="provider-grid">
                            {LLM_PROVIDERS.map(provider => (
                                <button
                                    key={provider.id}
                                    className={`provider-btn ${config.provider === provider.id ? 'active' : ''}`}
                                    onClick={() => handleProviderChange(provider.id)}
                                >
                                    {provider.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="form-group">
                        <label>API Key</label>
                        <div className="input-with-toggle">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={config.apiKey}
                                onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                placeholder="输入 API Key..."
                            />
                            <button
                                className="toggle-visibility"
                                onClick={() => setShowApiKey(!showApiKey)}
                            >
                                {showApiKey ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <span className="hint">输入 API Key 后将自动获取可用模型列表</span>
                    </div>

                    {/* Base URL */}
                    <div className="form-group">
                        <label>API Base URL</label>
                        <input
                            type="text"
                            value={config.baseUrl}
                            onChange={e => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                            placeholder={currentProvider?.defaultBaseUrl}
                        />
                        <span className="hint">留空使用默认地址，或输入自定义代理地址</span>
                    </div>

                    {/* 模型选择 */}
                    <div className="form-group">
                        <div className="label-with-action">
                            <label>
                                模型
                                {loadingModels && <span className="loading-spinner">⏳</span>}
                                {availableModels.length > 0 && !loadingModels && (
                                    <span className="model-count">({availableModels.length} 个可用)</span>
                                )}
                            </label>
                            <button
                                className="refresh-btn"
                                onClick={handleRefreshModels}
                                disabled={loadingModels || !config.apiKey}
                                title="刷新模型列表"
                            >
                                🔄
                            </button>
                        </div>

                        {modelsError && (
                            <div className="models-error">{modelsError}</div>
                        )}

                        {availableModels.length > 0 ? (
                            <select
                                value={config.model}
                                onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                                disabled={loadingModels}
                            >
                                {availableModels.map(model => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                        {model.contextLength && ` (${Math.round(model.contextLength / 1000)}K)`}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={config.model}
                                onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                                placeholder="输入模型名称..."
                            />
                        )}
                    </div>

                    {/* 高级设置 */}
                    <details className="advanced-settings">
                        <summary>高级设置</summary>
                        <div className="form-group">
                            <label>Temperature: {config.temperature}</label>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={config.temperature}
                                onChange={e => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Max Tokens: {config.maxTokens}</label>
                            <input
                                type="range"
                                min="256"
                                max="16384"
                                step="256"
                                value={config.maxTokens}
                                onChange={e => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                            />
                        </div>
                    </details>

                    {/* 测试结果 */}
                    {testResult && (
                        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                            {testResult.message}
                        </div>
                    )}
                </div>

                <footer className="modal-footer">
                    <button
                        className="test-btn"
                        onClick={handleTestConnection}
                        disabled={testing || !config.apiKey}
                    >
                        {testing ? '测试中...' : '🔌 测试连接'}
                    </button>
                    <div className="action-btns">
                        <button className="cancel-btn" onClick={onClose}>取消</button>
                        <button
                            className="save-btn"
                            onClick={handleSave}
                            disabled={!config.apiKey}
                        >
                            保存配置
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LLMConfigModal;
