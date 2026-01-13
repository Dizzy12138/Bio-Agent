import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Server, Key, CheckCircle, AlertCircle, Loader, ExternalLink } from 'lucide-react';
import type { KnowledgeAPIConfig } from '../api/knowledgeAPI';
import './APIConfigModal.css';

interface APIConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: KnowledgeAPIConfig) => void;
    currentConfig?: KnowledgeAPIConfig;
}

export const APIConfigModal: React.FC<APIConfigModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentConfig,
}) => {
    const [baseUrl, setBaseUrl] = useState(currentConfig?.baseUrl || '');
    const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
    const [isTesting, setIsTesting] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    const handleTest = async () => {
        if (!baseUrl) {
            setTestStatus('error');
            setTestMessage('请输入 API 地址');
            return;
        }

        setIsTesting(true);
        setTestStatus('idle');

        try {
            const response = await fetch(`${baseUrl}/health`, {
                method: 'GET',
                headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
            });

            if (response.ok) {
                setTestStatus('success');
                setTestMessage('连接成功！');
            } else {
                setTestStatus('error');
                setTestMessage(`连接失败: HTTP ${response.status}`);
            }
        } catch (error) {
            setTestStatus('error');
            setTestMessage('无法连接到服务器');
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = () => {
        onSave({
            baseUrl: baseUrl.replace(/\/$/, ''), // 移除末尾斜杠
            apiKey: apiKey || undefined,
        });
        onClose();
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="api-config-overlay" onClick={onClose}>
            <div className="api-config-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>
                        <Server size={22} />
                        API 连接配置
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="modal-body">
                    <p className="modal-description">
                        配置外部知识库平台的 API 连接信息，以获取文献和数据库内容。
                    </p>

                    <div className="form-group">
                        <label>
                            <Server size={16} />
                            API 地址
                        </label>
                        <input
                            type="url"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://api.example.com/v1"
                        />
                        <span className="form-hint">
                            外部平台提供的 API 基础地址
                        </span>
                    </div>

                    <div className="form-group">
                        <label>
                            <Key size={16} />
                            API 密钥 <span className="optional">(可选)</span>
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-xxxxxxxxxxxxxxxxxxxxx"
                        />
                        <span className="form-hint">
                            用于身份验证的 API 密钥
                        </span>
                    </div>

                    {/* 连接测试 */}
                    <div className="test-section">
                        <button
                            className="btn btn-outline test-btn"
                            onClick={handleTest}
                            disabled={isTesting || !baseUrl}
                        >
                            {isTesting ? (
                                <Loader size={16} className="spin" />
                            ) : (
                                <Server size={16} />
                            )}
                            {isTesting ? '测试中...' : '测试连接'}
                        </button>

                        {testStatus !== 'idle' && (
                            <div className={`test-result ${testStatus}`}>
                                {testStatus === 'success' ? (
                                    <CheckCircle size={16} />
                                ) : (
                                    <AlertCircle size={16} />
                                )}
                                {testMessage}
                            </div>
                        )}
                    </div>

                    {/* 帮助信息 */}
                    <div className="help-section">
                        <h4>API 要求</h4>
                        <ul>
                            <li>支持 REST API 接口</li>
                            <li>需要 <code>/health</code> 健康检查端点</li>
                            <li>需要 <code>/knowledge-bases</code> 知识库列表端点</li>
                            <li>需要 <code>/documents/search</code> 文档搜索端点</li>
                        </ul>
                        <a href="#" className="help-link">
                            <ExternalLink size={14} />
                            查看 API 文档
                        </a>
                    </div>
                </div>

                <footer className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>
                        取消
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={!baseUrl}
                    >
                        保存配置
                    </button>
                </footer>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
