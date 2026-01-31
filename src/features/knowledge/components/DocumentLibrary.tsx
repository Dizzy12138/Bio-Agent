import React, { useEffect, useState } from 'react';
import { useKnowledgeStore } from '../stores/knowledgeStore';
import type { Document } from '../api/knowledgeAPI';
import './DocumentLibrary.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DocumentLibraryProps {
    categoryId: string | null;
    searchQuery: string;
    viewMode: 'grid' | 'list';
    onItemSelect: (item: Document) => void;
    selectedItemId?: string;
}

// Status badge configuration
const statusConfig = {
    pending: { label: '待处理', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    parsing: { label: '解析中', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    indexed: { label: '已索引', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    error: { label: '错误', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

const PAGE_SIZE = 20;

// Format date
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
    searchQuery,
    viewMode,
    onItemSelect,
    selectedItemId,
}) => {
    const {
        searchResults: documents,
        isSearching: isLoading,
        searchTotal,
        searchDocuments
    } = useKnowledgeStore();

    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(searchTotal / PAGE_SIZE);

    // Load documents when page or search changes
    useEffect(() => {
        searchDocuments({
            query: searchQuery,
            page: currentPage,
            pageSize: PAGE_SIZE,
        });
    }, [currentPage, searchQuery, searchDocuments]);

    // Reset to page 1 when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    if (isLoading) {
        return (
            <div className={viewMode === 'grid' ? 'content-grid' : 'content-list'}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="loading-skeleton skeleton-card" />
                ))}
            </div>
        );
    }

    if (documents.length === 0) {
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
        <div className="flex flex-col h-full">
            {/* Document List */}
            <div className={`flex-1 overflow-y-auto ${viewMode === 'grid' ? 'content-grid' : 'content-list'}`}>
                {documents.map(doc => (
                    <DocumentCard
                        key={doc.id}
                        document={doc}
                        viewMode={viewMode}
                        isSelected={selectedItemId === doc.id}
                        onClick={() => onItemSelect(doc)}
                    />
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                    <div className="text-sm text-gray-500">
                        共 {searchTotal} 篇文献，第 {currentPage}/{totalPages} 页
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                            上一页
                        </button>
                        <span className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-600 rounded-md">
                            {currentPage}
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            下一页
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
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
                        {(document.authors || []).slice(0, 3).join(', ')}{document.authors && document.authors.length > 3 ? ' 等' : ''} · {document.source} · {document.publishDate && formatDate(document.publishDate)}
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
                {document.citations !== undefined && document.citations > 0 && (
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
                    {document.fileType?.toUpperCase() || 'PDF'}
                </div>
                <span
                    className="status-badge"
                    style={{ color: status.color, background: status.bg }}
                >
                    {status.label}
                </span>
            </div>

            <h3 className="document-card-title">{document.title}</h3>

            <p className="document-card-authors">{(document.authors || []).slice(0, 3).join(', ')}</p>

            {document.abstract && (
                <p className="document-card-abstract">{document.abstract.slice(0, 200)}...</p>
            )}

            <div className="document-card-meta">
                <span className="document-card-journal">{document.source}</span>
                <span className="document-card-date">{document.publishDate && formatDate(document.publishDate)}</span>
            </div>
        </div>
    );
};
