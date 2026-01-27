import React, { useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { LipinskiRule, LipinskiThresholds } from '../types';
import { countLipinskiViolations, getDruglikeness } from '../types';
import './RadarChart.css';

interface RadarChartProps {
    data: LipinskiRule | null;
    thresholds?: LipinskiThresholds;
    loading?: boolean;
}

// 默认阈值
const DEFAULT_THRESHOLDS: LipinskiThresholds = {
    molecularWeight: 500,
    logP: 5,
    hBondDonors: 5,
    hBondAcceptors: 10,
    rotatableBonds: 10,
    tpsa: 140
};

/**
 * RadarChart - 里宾斯基五规则雷达图
 * 
 * 可视化展示分子的成药性指标
 * 使用 SVG 绘制多边形雷达图
 */
export const RadarChart: React.FC<RadarChartProps> = ({
    data,
    thresholds = DEFAULT_THRESHOLDS,
    loading = false
}) => {
    // 雷达图配置（使用 useMemo 避免每次渲染时创建新对象）
    const config = useMemo(() => ({
        size: 280,
        center: 140,
        maxRadius: 100,
        levels: 5
    }), []);

    // 指标定义
    const metrics = useMemo(() => [
        { key: 'molecularWeight', label: 'MW', fullLabel: '分子量', threshold: thresholds.molecularWeight, unit: 'Da' },
        { key: 'logP', label: 'LogP', fullLabel: 'LogP', threshold: thresholds.logP, unit: '' },
        { key: 'hBondDonors', label: 'HBD', fullLabel: '氢键供体', threshold: thresholds.hBondDonors, unit: '' },
        { key: 'hBondAcceptors', label: 'HBA', fullLabel: '氢键受体', threshold: thresholds.hBondAcceptors, unit: '' },
        { key: 'tpsa', label: 'TPSA', fullLabel: '极性表面积', threshold: thresholds.tpsa, unit: 'Ų' },
    ], [thresholds]);

    // 计算多边形顶点
    const calculatePoints = useMemo(() => {
        if (!data) return null;

        const angleStep = (2 * Math.PI) / metrics.length;

        // 计算每个指标的归一化值（相对于阈值）
        const normalizedValues = metrics.map(metric => {
            const value = data[metric.key as keyof LipinskiRule] as number;
            const ratio = Math.min(value / metric.threshold, 1.5); // 最大 150%
            return ratio;
        });

        // 阈值线（100%）的点
        const thresholdPoints = metrics.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = config.maxRadius;
            return {
                x: config.center + r * Math.cos(angle),
                y: config.center + r * Math.sin(angle)
            };
        });

        // 数据点
        const dataPoints = normalizedValues.map((ratio, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = config.maxRadius * Math.min(ratio, 1);
            return {
                x: config.center + r * Math.cos(angle),
                y: config.center + r * Math.sin(angle),
                value: data[metrics[i].key as keyof LipinskiRule] as number,
                ratio,
                isViolation: ratio > 1
            };
        });

        // 标签位置
        const labelPoints = metrics.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = config.maxRadius + 35;
            return {
                x: config.center + r * Math.cos(angle),
                y: config.center + r * Math.sin(angle)
            };
        });

        return { thresholdPoints, dataPoints, labelPoints, normalizedValues };
    }, [data, metrics, config]);

    // 计算违规数量
    const violations = data ? countLipinskiViolations(data, thresholds) : 0;
    const druglikeness = getDruglikeness(violations);

    // Loading 状态
    if (loading) {
        return (
            <div className="radar-chart radar-chart--loading">
                <div className="radar-chart__skeleton" />
            </div>
        );
    }

    // 空状态
    if (!data || !calculatePoints) {
        return (
            <div className="radar-chart radar-chart--empty">
                <p>输入分子后显示成药性分析</p>
            </div>
        );
    }

    const { thresholdPoints, dataPoints, labelPoints } = calculatePoints;

    // 生成多边形路径
    const thresholdPath = thresholdPoints.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z';

    const dataPath = dataPoints.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z';

    // 确定状态颜色
    const statusColor = violations === 0
        ? 'var(--success-500)'
        : violations <= 1
            ? 'var(--warning-500)'
            : 'var(--error-500)';

    const StatusIcon = violations === 0
        ? CheckCircle
        : violations <= 1
            ? AlertCircle
            : XCircle;

    return (
        <div className="radar-chart">
            <header className="radar-chart__header">
                <h4>📊 里宾斯基五规则</h4>
                <div className="radar-chart__status" style={{ color: statusColor }}>
                    <StatusIcon size={16} />
                    <span>{druglikeness}</span>
                    {violations > 0 && (
                        <span className="radar-chart__violations">
                            ({violations} 项违规)
                        </span>
                    )}
                </div>
            </header>

            <svg
                className="radar-chart__svg"
                viewBox={`0 0 ${config.size} ${config.size}`}
                preserveAspectRatio="xMidYMid meet"
            >
                {/* 背景网格 */}
                {[1, 2, 3, 4, 5].map(level => {
                    const r = (config.maxRadius / 5) * level;
                    const points = metrics.map((_, i) => {
                        const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
                        return `${config.center + r * Math.cos(angle)},${config.center + r * Math.sin(angle)}`;
                    }).join(' ');
                    return (
                        <polygon
                            key={level}
                            points={points}
                            fill="none"
                            stroke="var(--border-color)"
                            strokeWidth="1"
                            opacity={level === 5 ? 0.8 : 0.4}
                        />
                    );
                })}

                {/* 轴线 */}
                {metrics.map((_, i) => {
                    const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
                    return (
                        <line
                            key={i}
                            x1={config.center}
                            y1={config.center}
                            x2={config.center + config.maxRadius * Math.cos(angle)}
                            y2={config.center + config.maxRadius * Math.sin(angle)}
                            stroke="var(--border-color)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* 阈值线（虚线） */}
                <path
                    d={thresholdPath}
                    fill="none"
                    stroke="var(--accent-500)"
                    strokeWidth="2"
                    strokeDasharray="4"
                    opacity="0.5"
                />

                {/* 数据区域 */}
                <path
                    d={dataPath}
                    fill={statusColor}
                    fillOpacity="0.2"
                    stroke={statusColor}
                    strokeWidth="2"
                />

                {/* 数据点 */}
                {dataPoints.map((point, i) => (
                    <g key={i}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="6"
                            fill={point.isViolation ? 'var(--error-500)' : statusColor}
                            stroke="white"
                            strokeWidth="2"
                        />
                        <title>
                            {metrics[i].fullLabel}: {point.value} {metrics[i].unit}
                            {point.isViolation ? ' (超标)' : ''}
                        </title>
                    </g>
                ))}

                {/* 标签 */}
                {labelPoints.map((point, i) => (
                    <g key={i}>
                        <text
                            x={point.x}
                            y={point.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="11"
                            fontWeight="600"
                            fill="var(--text-primary)"
                        >
                            {metrics[i].label}
                        </text>
                    </g>
                ))}
            </svg>

            {/* 详细数据 */}
            <div className="radar-chart__details">
                {metrics.map((metric) => {
                    const value = data[metric.key as keyof LipinskiRule] as number;
                    const isViolation = value > metric.threshold;
                    return (
                        <div
                            key={metric.key}
                            className={`radar-chart__detail-item ${isViolation ? 'violation' : ''}`}
                        >
                            <span className="radar-chart__detail-label">{metric.fullLabel}</span>
                            <span className="radar-chart__detail-value">
                                {typeof value === 'number' ? value.toFixed(1) : value}
                                {metric.unit && <small> {metric.unit}</small>}
                            </span>
                            <span className="radar-chart__detail-threshold">
                                ≤{metric.threshold}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
