import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendData } from '../types';
import './TrendChart.css';

interface TrendChartProps {
    data: TrendData | null;
    loading?: boolean;
}

/**
 * TrendChart - 趋势折线图
 * 
 * 展示实体在过去年份的研究热度曲线
 * 使用 SVG 绘制，支持悬浮查看具体数值
 */
export const TrendChart: React.FC<TrendChartProps> = ({
    data,
    loading = false
}) => {
    // 图表尺寸配置（使用 useMemo 避免每次渲染创建新对象）
    const config = useMemo(() => ({
        width: 400,
        height: 200,
        padding: { top: 20, right: 20, bottom: 40, left: 50 }
    }), []);

    const chartWidth = config.width - config.padding.left - config.padding.right;
    const chartHeight = config.height - config.padding.top - config.padding.bottom;

    // 计算数据点坐标
    const chartData = useMemo(() => {
        if (!data?.data.length) return null;

        const years = data.data.map(d => d.year);
        const counts = data.data.map(d => d.count);
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        const maxCount = Math.max(...counts);

        const xScale = (year: number) =>
            ((year - minYear) / (maxYear - minYear || 1)) * chartWidth + config.padding.left;

        const yScale = (count: number) =>
            config.height - config.padding.bottom - (count / (maxCount || 1)) * chartHeight;

        const points = data.data.map(d => ({
            x: xScale(d.year),
            y: yScale(d.count),
            year: d.year,
            count: d.count,
            growthRate: d.growthRate
        }));

        // 生成 SVG 路径
        const linePath = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ');

        // 生成填充区域路径
        const areaPath = `
      ${linePath}
      L ${points[points.length - 1].x} ${config.height - config.padding.bottom}
      L ${points[0].x} ${config.height - config.padding.bottom}
      Z
    `;

        // Y 轴刻度
        const yTicks = [0, maxCount * 0.25, maxCount * 0.5, maxCount * 0.75, maxCount].map(v => ({
            value: Math.round(v),
            y: yScale(v)
        }));

        // X 轴刻度（每隔几年显示）
        const step = Math.ceil((maxYear - minYear) / 5) || 1;
        const xTicks = [];
        for (let year = minYear; year <= maxYear; year += step) {
            xTicks.push({ year, x: xScale(year) });
        }

        return { points, linePath, areaPath, yTicks, xTicks, maxCount };
    }, [data, chartWidth, chartHeight, config]);

    // 计算整体趋势
    const trend = useMemo(() => {
        if (!data?.data.length || data.data.length < 2) return 'stable';
        const first = data.data[0].count;
        const last = data.data[data.data.length - 1].count;
        const change = (last - first) / (first || 1);
        if (change > 0.1) return 'up';
        if (change < -0.1) return 'down';
        return 'stable';
    }, [data]);

    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'var(--success-500)' : trend === 'down' ? 'var(--error-500)' : 'var(--text-muted)';

    // Loading 状态
    if (loading) {
        return (
            <div className="trend-chart trend-chart--loading">
                <div className="trend-chart__skeleton" />
            </div>
        );
    }

    // 空状态
    if (!data || !chartData) {
        return (
            <div className="trend-chart trend-chart--empty">
                <p>选择实体查看研究趋势</p>
            </div>
        );
    }

    return (
        <div className="trend-chart">
            {/* 头部信息 */}
            <header className="trend-chart__header">
                <div className="trend-chart__title">
                    <h4>📈 研究趋势</h4>
                    <span className="trend-chart__entity">{data.entityName}</span>
                </div>
                <div className="trend-chart__stats">
                    <div className="trend-chart__total">
                        共 <strong>{data.totalCount.toLocaleString()}</strong> 篇
                    </div>
                    <div className="trend-chart__trend" style={{ color: trendColor }}>
                        <TrendIcon size={16} />
                        {trend === 'up' ? '上升趋势' : trend === 'down' ? '下降趋势' : '平稳'}
                    </div>
                </div>
            </header>

            {/* SVG 图表 */}
            <svg
                className="trend-chart__svg"
                viewBox={`0 0 ${config.width} ${config.height}`}
                preserveAspectRatio="xMidYMid meet"
            >
                {/* 网格线 */}
                <g className="trend-chart__grid">
                    {chartData.yTicks.map((tick, i) => (
                        <line
                            key={i}
                            x1={config.padding.left}
                            y1={tick.y}
                            x2={config.width - config.padding.right}
                            y2={tick.y}
                            stroke="var(--border-color)"
                            strokeDasharray="4"
                        />
                    ))}
                </g>

                {/* Y 轴刻度 */}
                <g className="trend-chart__y-axis">
                    {chartData.yTicks.map((tick, i) => (
                        <text
                            key={i}
                            x={config.padding.left - 10}
                            y={tick.y}
                            textAnchor="end"
                            dominantBaseline="middle"
                            fill="var(--text-muted)"
                            fontSize="10"
                        >
                            {tick.value}
                        </text>
                    ))}
                </g>

                {/* X 轴刻度 */}
                <g className="trend-chart__x-axis">
                    {chartData.xTicks.map((tick, i) => (
                        <text
                            key={i}
                            x={tick.x}
                            y={config.height - config.padding.bottom + 20}
                            textAnchor="middle"
                            fill="var(--text-muted)"
                            fontSize="10"
                        >
                            {tick.year}
                        </text>
                    ))}
                </g>

                {/* 渐变定义 */}
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-500)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--accent-500)" stopOpacity="0.02" />
                    </linearGradient>
                </defs>

                {/* 填充区域 */}
                <path
                    d={chartData.areaPath}
                    fill="url(#areaGradient)"
                />

                {/* 折线 */}
                <path
                    d={chartData.linePath}
                    fill="none"
                    stroke="var(--accent-500)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* 数据点 */}
                {chartData.points.map((point, i) => (
                    <g key={i} className="trend-chart__point">
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="5"
                            fill="var(--bg-primary)"
                            stroke="var(--accent-500)"
                            strokeWidth="2"
                        />
                        <title>{`${point.year}: ${point.count} 篇`}</title>
                    </g>
                ))}
            </svg>
        </div>
    );
};
