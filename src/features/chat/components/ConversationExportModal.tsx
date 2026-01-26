import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, FileCode, FileJson, Globe } from 'lucide-react';
import type { Conversation, Message } from '../../../types';
import { downloadConversation } from '../utils/exportConversation';
import './ConversationExportModal.css';

type ExportFormat = 'markdown' | 'text' | 'json' | 'html';

interface FormatOption {
    id: ExportFormat;
    name: string;
    description: string;
    icon: React.ReactNode;
    extension: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
    {
        id: 'markdown',
        name: 'Markdown',
        description: '结构化文档，适合编辑和分享',
        icon: <FileText size={24} />,
        extension: '.md',
    },
    {
        id: 'html',
        name: 'HTML',
        description: '网页格式，可直接打印为 PDF',
        icon: <Globe size={24} />,
        extension: '.html',
    },
    {
        id: 'text',
        name: '纯文本',
        description: '简洁无格式，兼容性最好',
        icon: <FileCode size={24} />,
        extension: '.txt',
    },
    {
        id: 'json',
        name: 'JSON',
        description: '数据备份，可用于导入恢复',
        icon: <FileJson size={24} />,
        extension: '.json',
    },
];

interface ConversationExportModalProps {
    isOpen: boolean;
    conversation: Conversation | null;
    messages: Message[];
    onClose: () => void;
}

export const ConversationExportModal: React.FC<ConversationExportModalProps> = ({
    isOpen,
    conversation,
    messages,
    onClose,
}) => {
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = () => {
        if (!conversation) return;

        setIsExporting(true);

        // 模拟短暂延迟
        setTimeout(() => {
            downloadConversation(conversation, messages, selectedFormat);
            setIsExporting(false);
            onClose();
        }, 300);
    };

    const modalContent = (
        <div className="conv-export-overlay" onClick={onClose}>
            <div className="conv-export-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <header className="export-header">
                    <div className="export-title-area">
                        <h2 className="export-title">
                            <Download size={22} />
                            导出对话
                        </h2>
                        <p className="export-subtitle">选择导出格式，保存当前对话记录</p>
                    </div>
                    <button className="export-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                {/* Preview Info */}
                <div className="export-preview">
                    <div className="preview-info">
                        <span className="preview-avatar">
                            {conversation?.expertAvatar || '💬'}
                        </span>
                        <div>
                            <div className="preview-title">{conversation?.title}</div>
                            <div className="preview-meta">
                                {conversation?.expertName && (
                                    <span>{conversation.expertName} · </span>
                                )}
                                <span>{messages.length} 条消息</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Format Selection */}
                <div className="format-section">
                    <h4 className="section-label">选择导出格式</h4>
                    <div className="format-grid">
                        {FORMAT_OPTIONS.map(format => (
                            <label
                                key={format.id}
                                className={`format-card ${selectedFormat === format.id ? 'selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="format"
                                    value={format.id}
                                    checked={selectedFormat === format.id}
                                    onChange={() => setSelectedFormat(format.id)}
                                />
                                <div className="format-icon">{format.icon}</div>
                                <div className="format-info">
                                    <span className="format-name">
                                        {format.name}
                                        <span className="format-ext">{format.extension}</span>
                                    </span>
                                    <span className="format-desc">{format.description}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Tips */}
                <div className="export-tips">
                    <p>
                        💡 <strong>提示:</strong> 选择 HTML 格式后，可在浏览器中打开并使用"打印"功能保存为 PDF。
                    </p>
                </div>

                {/* Footer */}
                <footer className="export-footer">
                    <button className="btn btn-outline" onClick={onClose}>
                        取消
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        <Download size={16} />
                        {isExporting ? '导出中...' : '导出'}
                    </button>
                </footer>
            </div>
        </div>
    );

    return (isOpen && conversation) ? createPortal(modalContent, document.body) : null;
};
