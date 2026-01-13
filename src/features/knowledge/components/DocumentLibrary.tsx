import React, { useEffect } from 'react';
import { useKnowledgeStore } from '../stores/knowledgeStore';
import type { Document } from '../api/knowledgeAPI';
import './DocumentLibrary.css';

interface DocumentLibraryProps {
    categoryId: string | null;
    searchQuery: string;
    viewMode: 'grid' | 'list';
    onItemSelect: (item: Document) => void;
    selectedItemId?: string;
}

// 状态标签配置
const statusConfig = {
    pending: { label: '待处理', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    parsing: { label: '解析中', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    indexed: { label: '已索引', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    error: { label: '错误', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
};



// 格式化文件大小
const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// 格式化日期
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
    categoryId,
    searchQuery,
    viewMode,
    onItemSelect,
    selectedItemId,
}) => {
    const {
        searchResults: documents,
        isSearching: isLoading,
        searchDocuments
    } = useKnowledgeStore();

    // 当分类或搜索词变化时触发搜索
    useEffect(() => {
        searchDocuments({
            query: searchQuery,
            knowledgeBaseIds: categoryId ? [categoryId] : undefined,
        });
    }, [categoryId, searchQuery, searchDocuments]);

    const filteredDocuments = documents; // Already filtered by API/Store

    if (isLoading) {
        return (
            <div className={viewMode === 'grid' ? 'content-grid' : 'content-list'}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="loading-skeleton skeleton-card" />
                ))}
            </div>
        );
    }

    if (filteredDocuments.length === 0) {
        return (
            <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12h6M12 9v6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                <h3 className="empty-state-title">暂无文献</h3>
                <p className="empty-state-description">
                    {searchQuery ? '没有找到匹配的文献，请尝试其他搜索关键词' : '该知识库下暂无文献'}
                </p>
            </div>
        );
    }

    return (
        <div className={viewMode === 'grid' ? 'content-grid' : 'content-list'}>
            {filteredDocuments.map(doc => (
                <DocumentCard
                    key={doc.id}
                    document={doc}
                    viewMode={viewMode}
                    isSelected={selectedItemId === doc.id}
                    onClick={() => onItemSelect(doc)}
                />
            ))}
        </div>
    );
};

interface DocumentCardProps {
    document: Document;
    viewMode: 'grid' | 'list';
    isSelected: boolean;
    onClick: () => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, viewMode, isSelected, onClick }) => {
    const status = document.status ? statusConfig[document.status] : statusConfig.indexed;

    if (viewMode === 'list') {
        return (
            <div
                className={`document-list-item ${isSelected ? 'selected' : ''}`}
                onClick={onClick}
            >
                <div className="document-list-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                    </svg>
                </div>
                <div className="document-list-content">
                    <h4 className="document-list-title">{document.title}</h4>
                    <p className="document-list-meta">
                        {(document.authors || []).join(', ')} · {document.source} · {document.publishDate && formatDate(document.publishDate)}
                    </p>
                </div>
                <div className="document-list-status">
                    <span
                        className="status-badge"
                        style={{ color: status.color, background: status.bg }}
                    >
                        {status.label}
                    </span>
                </div>
                {document.citations && (
                    <div className="document-list-citations">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                            <path d="M12 20V10M18 20V4M6 20v-4" />
                        </svg>
                        {document.citations}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className={`document-card ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
        >
            <div className="document-card-header">
                <div className="document-type-badge">
                    {document.fileType?.toUpperCase() || 'DOC'}
                </div>
                <span
                    className="status-badge"
                    style={{ color: (status || statusConfig.indexed).color, background: (status || statusConfig.indexed).bg }}
                >
                    {document.status === 'parsing' && (
                        <span className="status-spinner" />
                    )}
                    {status.label}
                </span>
            </div>

            <h3 className="document-card-title">{document.title}</h3>

            <p className="document-card-authors">{(document.authors || []).join(', ')}</p>

            <p className="document-card-abstract">{document.abstract}</p>

            <div className="document-card-meta">
                <span className="document-card-journal">{document.source}</span>
                <span className="document-card-date">{document.publishDate && formatDate(document.publishDate)}</span>
            </div>

            <div className="document-card-footer">
                <div className="document-card-keywords">
                    {(document.keywords || []).slice(0, 3).map((keyword, i) => (
                        <span key={i} className="keyword-tag">{keyword}</span>
                    ))}
                    {(document.keywords || []).length > 3 && (
                        <span className="keyword-tag more">+{document.keywords!.length - 3}</span>
                    )}
                </div>

                <div className="document-card-stats">
                    {document.citations && (
                        <span className="stat-item" title="引用次数">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                <path d="M12 20V10M18 20V4M6 20v-4" />
                            </svg>
                            {document.citations}
                        </span>
                    )}
                    <span className="stat-item" title="文件大小">
                        {document.fileSize ? formatFileSize(document.fileSize) : '-'}
                    </span>
                </div>
            </div>
        </div>
    );
};
