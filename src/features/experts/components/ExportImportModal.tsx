import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Download,
    Upload,
    FileJson,
    FileText,
    Link,
    Copy,
    Check,
    AlertCircle
} from 'lucide-react';
import type { Expert } from '../types';
import {
    exportExpertToJSON,
    exportExpertToMarkdown,
    downloadFile,
    readUploadedFile,
    validateImportData,
    generateShareLink,
    type ExpertConfig,
} from '../exportImport';
import './ExportImportModal.css';

interface ExportImportModalProps {
    isOpen: boolean;
    mode: 'export' | 'import';
    expert?: Expert; // 导出时需要
    onClose: () => void;
    onImport?: (config: ExpertConfig) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
    isOpen,
    mode,
    expert,
    onClose,
    onImport,
}) => {
    const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
    const [exportFormat, setExportFormat] = useState<'json' | 'markdown'>('json');
    const [shareLink, setShareLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importPreview, setImportPreview] = useState<ExpertConfig | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 处理导出
    const handleExport = () => {
        if (!expert) return;

        if (exportFormat === 'json') {
            const content = exportExpertToJSON(expert);
            downloadFile(content, `${expert.name}.json`, 'application/json');
        } else {
            const content = exportExpertToMarkdown(expert);
            downloadFile(content, `${expert.name}.md`, 'text/markdown');
        }
        onClose();
    };

    // 生成分享链接
    const handleGenerateLink = () => {
        if (!expert) return;
        const link = generateShareLink(expert);
        setShareLink(link);
    };

    // 复制链接
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    // 处理文件选择
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportError(null);
        setImportPreview(null);

        try {
            const content = await readUploadedFile(file);
            const data = JSON.parse(content);
            const result = validateImportData(data);

            if (result.valid && result.config) {
                setImportPreview(result.config);
            } else {
                setImportError(result.error || '验证失败');
            }
        } catch {
            setImportError('文件解析失败，请确保是有效的 JSON 文件');
        }
    };

    // 确认导入
    const handleConfirmImport = () => {
        if (importPreview && onImport) {
            onImport(importPreview);
            onClose();
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="export-import-overlay" onClick={onClose}>
            <div className="export-import-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <header className="modal-header">
                    <h2 className="modal-title">
                        {mode === 'export' ? (
                            <>
                                <Download size={22} />
                                导出专家配置
                            </>
                        ) : (
                            <>
                                <Upload size={22} />
                                导入专家配置
                            </>
                        )}
                    </h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                {/* Tabs */}
                <div className="modal-tabs">
                    <button
                        className={`modal-tab ${activeTab === 'file' ? 'active' : ''}`}
                        onClick={() => setActiveTab('file')}
                    >
                        {mode === 'export' ? <Download size={16} /> : <Upload size={16} />}
                        {mode === 'export' ? '下载文件' : '上传文件'}
                    </button>
                    <button
                        className={`modal-tab ${activeTab === 'link' ? 'active' : ''}`}
                        onClick={() => setActiveTab('link')}
                    >
                        <Link size={16} />
                        {mode === 'export' ? '分享链接' : '粘贴链接'}
                    </button>
                </div>

                {/* Content */}
                <div className="modal-content">
                    {mode === 'export' ? (
                        // 导出模式
                        <>
                            {activeTab === 'file' && expert && (
                                <div className="export-file-section">
                                    <div className="export-preview">
                                        <div className="preview-badge">
                                            <span className="preview-avatar">{expert.avatar}</span>
                                            <div>
                                                <div className="preview-name">{expert.name}</div>
                                                <div className="preview-domain">{expert.domain}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="format-selector">
                                        <h4>选择导出格式</h4>
                                        <div className="format-options">
                                            <label
                                                className={`format-option ${exportFormat === 'json' ? 'selected' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="format"
                                                    value="json"
                                                    checked={exportFormat === 'json'}
                                                    onChange={() => setExportFormat('json')}
                                                />
                                                <FileJson size={24} />
                                                <div>
                                                    <span className="format-name">JSON</span>
                                                    <span className="format-desc">可重新导入的结构化数据</span>
                                                </div>
                                            </label>
                                            <label
                                                className={`format-option ${exportFormat === 'markdown' ? 'selected' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="format"
                                                    value="markdown"
                                                    checked={exportFormat === 'markdown'}
                                                    onChange={() => setExportFormat('markdown')}
                                                />
                                                <FileText size={24} />
                                                <div>
                                                    <span className="format-name">Markdown</span>
                                                    <span className="format-desc">可读性好，便于分享查看</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'link' && expert && (
                                <div className="share-link-section">
                                    <p className="section-hint">生成分享链接，他人可通过链接一键导入此专家配置</p>

                                    {!shareLink ? (
                                        <button className="generate-link-btn" onClick={handleGenerateLink}>
                                            <Link size={18} />
                                            生成分享链接
                                        </button>
                                    ) : (
                                        <div className="link-display">
                                            <input
                                                type="text"
                                                value={shareLink}
                                                readOnly
                                                className="link-input"
                                            />
                                            <button
                                                className="copy-link-btn"
                                                onClick={handleCopyLink}
                                            >
                                                {linkCopied ? <Check size={18} /> : <Copy size={18} />}
                                                {linkCopied ? '已复制' : '复制'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        // 导入模式
                        <>
                            {activeTab === 'file' && (
                                <div className="import-file-section">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />

                                    <div
                                        className="upload-zone"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={40} />
                                        <p>点击或拖拽文件到此处</p>
                                        <span>支持 .json 格式</span>
                                    </div>

                                    {importError && (
                                        <div className="import-error">
                                            <AlertCircle size={16} />
                                            {importError}
                                        </div>
                                    )}

                                    {importPreview && (
                                        <div className="import-preview">
                                            <h4>预览</h4>
                                            <div className="preview-card">
                                                <div className="preview-avatar-lg">{importPreview.avatar}</div>
                                                <div className="preview-info">
                                                    <div className="preview-name">{importPreview.name}</div>
                                                    <div className="preview-domain">{importPreview.domain}</div>
                                                    <div className="preview-desc">{importPreview.description}</div>
                                                </div>
                                            </div>
                                            <div className="preview-details">
                                                <div className="detail-row">
                                                    <span>能力标签:</span>
                                                    <span>{importPreview.capabilities.join(', ')}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span>工具数量:</span>
                                                    <span>{importPreview.tools.length} 个</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'link' && (
                                <div className="import-link-section">
                                    <p className="section-hint">粘贴分享链接，一键导入专家配置</p>
                                    <input
                                        type="text"
                                        placeholder="粘贴分享链接..."
                                        className="link-input full"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <footer className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>取消</button>
                    {mode === 'export' && activeTab === 'file' && (
                        <button className="btn btn-primary" onClick={handleExport}>
                            <Download size={16} />
                            下载
                        </button>
                    )}
                    {mode === 'import' && importPreview && (
                        <button className="btn btn-primary" onClick={handleConfirmImport}>
                            <Upload size={16} />
                            确认导入
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
