import React from 'react';
import type { AbundanceData } from '../types';
import './AbundanceChart.css';

interface AbundanceChartProps {
    data: AbundanceData | null;
    loading?: boolean;
}

/**
 * AbundanceChart - 丰度柱状图
 * 
 * 展示微生物在不同样本中的相对丰度
 */
export const AbundanceChart: React.FC<AbundanceChartProps> = ({
    data,
    loading = false
}) => {
    // Loading 状态
    if (loading) {
        return (
            <div className="abundance-chart abundance-chart--loading">
                <div className="abundance-chart__skeleton">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="abundance-chart__skeleton-bar" style={{ height: `${20 + Math.random() * 60}%` }} />
                    ))}
                </div>
            </div>
        );
    }

    // 空状态
    if (!data || data.samples.length === 0) {
        return (
            <div className="abundance-chart abundance-chart--empty">
                <div className="abundance-chart__empty-icon">📊</div>
                <p>暂无丰度数据</p>
            </div>
        );
    }

    const maxPercentage = Math.max(...data.samples.map(s => s.percentage));

    // 根据分组获取颜色
    const getBarColor = (group?: string) => {
        const colors: Record<string, string> = {
            'healthy': '#22c55e',
            'disease': '#ef4444',
            'treatment': '#f59e0b',
            'control': '#3b82f6',
        };
        return colors[group || 'control'] || 'var(--accent-500)';
    };

    return (
        <div className="abundance-chart">
            <header className="abundance-chart__header">
                <div className="abundance-chart__title">
                    <h4>📊 相对丰度分布</h4>
                    <span className="abundance-chart__microbe">{data.microbeName}</span>
                </div>
                <div className="abundance-chart__avg">
                    平均: <strong>{data.averageAbundance.toFixed(2)}%</strong>
                </div>
            </header>

            <div className="abundance-chart__content">
                {/* 柱状图 */}
                <div className="abundance-chart__bars">
                    {data.samples.map((sample, index) => (
                        <div key={sample.sampleId} className="abundance-chart__bar-container">
                            <div
                                className="abundance-chart__bar"
                                style={{
                                    height: `${(sample.percentage / maxPercentage) * 100}%`,
                                    background: getBarColor(sample.group),
                                    animationDelay: `${index * 50}ms`
                                }}
                            >
                                <span className="abundance-chart__bar-value">
                                    {sample.percentage.toFixed(1)}%
                                </span>
                            </div>
                            <span className="abundance-chart__bar-label">
                                {sample.sampleName.length > 8
                                    ? sample.sampleName.slice(0, 8) + '…'
                                    : sample.sampleName}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Y 轴刻度 */}
                <div className="abundance-chart__y-axis">
                    {[100, 75, 50, 25, 0].map(value => (
                        <span key={value} className="abundance-chart__y-tick">
                            {((value / 100) * maxPercentage).toFixed(1)}%
                        </span>
                    ))}
                </div>
            </div>

            {/* 图例 */}
            <footer className="abundance-chart__legend">
                {['control', 'healthy', 'disease', 'treatment'].map(group => (
                    <div key={group} className="abundance-chart__legend-item">
                        <span
                            className="abundance-chart__legend-dot"
                            style={{ background: getBarColor(group) }}
                        />
                        <span>{group === 'control' ? '对照组' : group === 'healthy' ? '健康组' : group === 'disease' ? '疾病组' : '治疗组'}</span>
                    </div>
                ))}
            </footer>
        </div>
    );
};
