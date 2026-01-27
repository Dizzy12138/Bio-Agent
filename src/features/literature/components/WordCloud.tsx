import React, { useMemo } from 'react';
import type { WordCloudItem, EntityType } from '../types';
import './WordCloud.css';

interface WordCloudProps {
    words: WordCloudItem[];
    loading?: boolean;
    onWordClick?: (word: WordCloudItem) => void;
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

// 预定义的骨架屏宽度值，避免在渲染时使用 Math.random()
const SKELETON_WIDTHS = [76, 52, 89, 45, 91, 68, 54, 82, 47, 73, 95, 61];

/**
 * 基于 value 的确定性 shuffle，避免使用 Math.random()
 * 每次相同输入产生相同输出，保证渲染纯度
 */
function deterministicShuffle<T extends { value: number }>(arr: T[]): T[] {
    return [...arr].sort((a, b) => {
        // 使用 value 的小数部分作为排序依据
        const aKey = (a.value * 7919) % 1000;
        const bKey = (b.value * 7919) % 1000;
        return aKey - bKey;
    });
}

/**
 * WordCloud - 高频共现词云
 * 
 * 简化版词云实现，使用 CSS 布局
 * 支持点击跳转到对应实体
 */
export const WordCloud: React.FC<WordCloudProps> = ({
    words,
    loading = false,
    onWordClick
}) => {
    // 根据频率计算字体大小
    const processedWords = useMemo(() => {
        if (!words.length) return [];

        const maxValue = Math.max(...words.map(w => w.value));
        const minValue = Math.min(...words.map(w => w.value));
        const range = maxValue - minValue || 1;

        const mapped = words.map(word => ({
            ...word,
            fontSize: 12 + ((word.value - minValue) / range) * 24, // 12px - 36px
            opacity: 0.5 + ((word.value - minValue) / range) * 0.5  // 0.5 - 1
        }));

        // 使用确定性 shuffle 替代 Math.random()
        return deterministicShuffle(mapped);
    }, [words]);

    // Loading 状态
    if (loading) {
        return (
            <div className="word-cloud word-cloud--loading">
                <div className="word-cloud__skeleton">
                    {SKELETON_WIDTHS.map((width, i) => (
                        <span
                            key={i}
                            className="word-cloud__skeleton-word"
                            style={{
                                width,
                                animationDelay: `${i * 0.1}s`
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // 空状态
    if (words.length === 0) {
        return (
            <div className="word-cloud word-cloud--empty">
                <div className="word-cloud__empty-icon">☁️</div>
                <p>暂无词云数据</p>
            </div>
        );
    }

    return (
        <div className="word-cloud">
            <header className="word-cloud__header">
                <h4>🏷️ 高频共现词</h4>
            </header>
            <div className="word-cloud__content">
                {processedWords.map((word, index) => (
                    <button
                        key={word.text}
                        className="word-cloud__word"
                        style={{
                            fontSize: word.fontSize,
                            color: word.entityType ? COLORS[word.entityType] : 'var(--text-secondary)',
                            opacity: word.opacity,
                            animationDelay: `${index * 50}ms`
                        }}
                        onClick={() => onWordClick?.(word)}
                        title={`${word.text} (${word.value} 次)`}
                    >
                        {word.text}
                    </button>
                ))}
            </div>
        </div>
    );
};
