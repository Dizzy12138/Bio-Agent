import React from 'react';
import { ExternalLink, Calendar, Users, BookOpen } from 'lucide-react';
import type { Publication, HighlightFragment, EntityType } from '../types';
import './EvidenceCard.css';

interface EvidenceCardProps {
    publication: Publication;
    onEntityClick?: (entityId: string) => void;
}

// 实体类型颜色映射
const COLORS: Record<EntityType, string> = {
    gene: '#8b5cf6',
    drug: '#f59e0b',
    disease: '#ef4444',
    protein: '#06b6d4',
    pathway: '#22c55e',
    organism: '#ec4899'
};

/**
 * EvidenceCard - 论文证据卡片
 * 
 * 显示论文摘要信息，自动高亮关键词实体
 */
export const EvidenceCard: React.FC<EvidenceCardProps> = ({
    publication,
    onEntityClick
}) => {
    const { title, authors, journal, year, abstract, highlights, pmid, doi } = publication;

    // 渲染高亮文本
    const renderHighlightedText = (text: string, highlights: HighlightFragment[]) => {
        if (!highlights.length) {
            return <span>{text}</span>;
        }

        // 按起始位置排序
        const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);
        const elements: React.ReactNode[] = [];
        let lastEnd = 0;

        sortedHighlights.forEach((highlight, index) => {
            // 添加高亮前的普通文本
            if (highlight.start > lastEnd) {
                elements.push(
                    <span key={`text-${index}`}>
                        {text.slice(lastEnd, highlight.start)}
                    </span>
                );
            }

            // 添加高亮文本
            elements.push(
                <mark
                    key={`highlight-${index}`}
                    className="evidence-card__highlight"
                    style={{
                        backgroundColor: highlight.entityType
                            ? `${COLORS[highlight.entityType]}20`
                            : 'var(--warning-500)',
                        borderBottomColor: highlight.entityType
                            ? COLORS[highlight.entityType]
                            : 'var(--warning-500)'
                    }}
                    onClick={() => highlight.entityId && onEntityClick?.(highlight.entityId)}
                >
                    {highlight.text}
                </mark>
            );

            lastEnd = highlight.end;
        });

        // 添加剩余文本
        if (lastEnd < text.length) {
            elements.push(
                <span key="text-end">{text.slice(lastEnd)}</span>
            );
        }

        return <>{elements}</>;
    };

    // 格式化作者列表
    const formatAuthors = (authors: string[]) => {
        if (authors.length <= 3) {
            return authors.join(', ');
        }
        return `${authors.slice(0, 3).join(', ')} et al.`;
    };

    return (
        <article className="evidence-card">
            {/* 卡片头部 */}
            <header className="evidence-card__header">
                <h4 className="evidence-card__title">{title}</h4>
                <div className="evidence-card__meta">
                    <span className="evidence-card__meta-item">
                        <Users size={14} />
                        {formatAuthors(authors)}
                    </span>
                    <span className="evidence-card__meta-item">
                        <BookOpen size={14} />
                        {journal}
                    </span>
                    <span className="evidence-card__meta-item">
                        <Calendar size={14} />
                        {year}
                    </span>
                </div>
            </header>

            {/* 摘要内容 */}
            <div className="evidence-card__content">
                <p className="evidence-card__abstract">
                    {renderHighlightedText(abstract, highlights)}
                </p>
            </div>

            {/* 卡片底部 */}
            <footer className="evidence-card__footer">
                <div className="evidence-card__ids">
                    {pmid && (
                        <span className="evidence-card__id">PMID: {pmid}</span>
                    )}
                    {doi && (
                        <span className="evidence-card__id">DOI: {doi}</span>
                    )}
                </div>
                <div className="evidence-card__actions">
                    <a
                        href={pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}` : `https://doi.org/${doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="evidence-card__link"
                    >
                        查看原文
                        <ExternalLink size={14} />
                    </a>
                </div>
            </footer>
        </article>
    );
};

interface EvidenceListProps {
    publications: Publication[];
    loading?: boolean;
    onEntityClick?: (entityId: string) => void;
}

/**
 * EvidenceList - 证据列表
 */
export const EvidenceList: React.FC<EvidenceListProps> = ({
    publications,
    loading = false,
    onEntityClick
}) => {
    if (loading) {
        return (
            <div className="evidence-list evidence-list--loading">
                {[1, 2, 3].map(i => (
                    <div key={i} className="evidence-card evidence-card--skeleton">
                        <div className="skeleton-line skeleton-line--title" />
                        <div className="skeleton-line skeleton-line--meta" />
                        <div className="skeleton-line skeleton-line--content" />
                        <div className="skeleton-line skeleton-line--content" />
                    </div>
                ))}
            </div>
        );
    }

    if (publications.length === 0) {
        return (
            <div className="evidence-list evidence-list--empty">
                <div className="evidence-list__empty-icon">📄</div>
                <p>暂无相关文献</p>
            </div>
        );
    }

    return (
        <div className="evidence-list">
            {publications.map(pub => (
                <EvidenceCard
                    key={pub.id}
                    publication={pub}
                    onEntityClick={onEntityClick}
                />
            ))}
        </div>
    );
};
