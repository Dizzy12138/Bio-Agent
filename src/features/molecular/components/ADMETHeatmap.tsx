import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { ADMETProperties, ADMETProperty, RiskLevel } from '../types';
import { getRiskColor } from '../types';
import './ADMETHeatmap.css';

interface ADMETHeatmapProps {
    data: ADMETProperties | null;
    loading?: boolean;
}

// ADMET 分类配置
const ADMET_CATEGORIES = [
    { id: 'absorption', label: '吸收 (A)', icon: '💊' },
    { id: 'distribution', label: '分布 (D)', icon: '🔄' },
    { id: 'metabolism', label: '代谢 (M)', icon: '⚗️' },
    { id: 'excretion', label: '排泄 (E)', icon: '🚰' },
    { id: 'toxicity', label: '毒性 (T)', icon: '☠️' },
] as const;

/**
 * ADMETHeatmap - ADMET 属性热力图
 * 
 * 以热力图形式展示 ADMET 预测结果
 * 红/黄/绿颜色标记风险等级
 */
export const ADMETHeatmap: React.FC<ADMETHeatmapProps> = ({
    data,
    loading = false
}) => {
    // 获取风险图标
    const getRiskIcon = (risk: RiskLevel) => {
        switch (risk) {
            case 'low':
                return <CheckCircle size={14} />;
            case 'medium':
                return <AlertTriangle size={14} />;
            case 'high':
                return <XCircle size={14} />;
        }
    };

    // 获取风险标签
    const getRiskLabel = (risk: RiskLevel) => {
        switch (risk) {
            case 'low': return '低风险';
            case 'medium': return '中风险';
            case 'high': return '高风险';
        }
    };

    // 获取成药性样式
    const getDruglikenessStyle = (score: string) => {
        switch (score) {
            case 'Excellent': return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
            case 'Good': return { color: '#84cc16', bg: 'rgba(132, 204, 22, 0.1)' };
            case 'Moderate': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
            case 'Poor': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
            default: return { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' };
        }
    };

    // Loading 状态
    if (loading) {
        return (
            <div className="admet-heatmap admet-heatmap--loading">
                <div className="admet-heatmap__skeleton">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="admet-heatmap__skeleton-row" />
                    ))}
                </div>
            </div>
        );
    }

    // 空状态
    if (!data) {
        return (
            <div className="admet-heatmap admet-heatmap--empty">
                <div className="admet-heatmap__empty-icon">📋</div>
                <p>输入分子后显示 ADMET 预测</p>
            </div>
        );
    }

    const druglikenessStyle = getDruglikenessStyle(data.druglikeness);

    return (
        <div className="admet-heatmap">
            {/* 头部 - 总体评分 */}
            <header className="admet-heatmap__header">
                <div className="admet-heatmap__title">
                    <h4>💉 ADMET 属性预测</h4>
                </div>
                <div className="admet-heatmap__summary">
                    <div
                        className="admet-heatmap__overall-score"
                        style={{
                            background: druglikenessStyle.bg,
                            color: druglikenessStyle.color
                        }}
                    >
                        <span className="admet-heatmap__score-label">成药性</span>
                        <span className="admet-heatmap__score-value">{data.druglikeness}</span>
                    </div>
                    <div className="admet-heatmap__score-bar">
                        <div
                            className="admet-heatmap__score-fill"
                            style={{
                                width: `${data.overallScore}%`,
                                background: druglikenessStyle.color
                            }}
                        />
                    </div>
                    <span className="admet-heatmap__score-percent">{data.overallScore}%</span>
                </div>
            </header>

            {/* ADMET 分类列表 */}
            <div className="admet-heatmap__categories">
                {ADMET_CATEGORIES.map(category => {
                    const properties = data[category.id] as ADMETProperty[];
                    if (!properties?.length) return null;

                    // 计算该类别的整体风险
                    const highCount = properties.filter(p => p.risk === 'high').length;
                    const mediumCount = properties.filter(p => p.risk === 'medium').length;
                    const categoryRisk: RiskLevel =
                        highCount > 0 ? 'high' :
                            mediumCount > properties.length / 2 ? 'medium' : 'low';

                    return (
                        <div key={category.id} className="admet-heatmap__category">
                            <div className="admet-heatmap__category-header">
                                <span className="admet-heatmap__category-icon">{category.icon}</span>
                                <span className="admet-heatmap__category-label">{category.label}</span>
                                <span
                                    className="admet-heatmap__category-status"
                                    style={{ color: getRiskColor(categoryRisk) }}
                                >
                                    {getRiskIcon(categoryRisk)}
                                </span>
                            </div>

                            <div className="admet-heatmap__properties">
                                {properties.map((prop, index) => (
                                    <div
                                        key={index}
                                        className="admet-heatmap__property"
                                        style={{
                                            borderLeftColor: getRiskColor(prop.risk)
                                        }}
                                    >
                                        <div className="admet-heatmap__property-main">
                                            <span className="admet-heatmap__property-name">{prop.name}</span>
                                            <span
                                                className="admet-heatmap__property-risk"
                                                style={{
                                                    color: getRiskColor(prop.risk),
                                                    background: `${getRiskColor(prop.risk)}15`
                                                }}
                                            >
                                                {getRiskIcon(prop.risk)}
                                                {getRiskLabel(prop.risk)}
                                            </span>
                                        </div>
                                        <div className="admet-heatmap__property-value">
                                            {typeof prop.value === 'number'
                                                ? prop.value.toFixed(2)
                                                : prop.value}
                                            {prop.unit && <small> {prop.unit}</small>}
                                        </div>
                                        {prop.description && (
                                            <div className="admet-heatmap__property-desc">
                                                <Info size={12} />
                                                {prop.description}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 图例 */}
            <footer className="admet-heatmap__legend">
                <div className="admet-heatmap__legend-item">
                    <span className="admet-heatmap__legend-dot" style={{ background: '#22c55e' }} />
                    低风险
                </div>
                <div className="admet-heatmap__legend-item">
                    <span className="admet-heatmap__legend-dot" style={{ background: '#f59e0b' }} />
                    中风险
                </div>
                <div className="admet-heatmap__legend-item">
                    <span className="admet-heatmap__legend-dot" style={{ background: '#ef4444' }} />
                    高风险
                </div>
            </footer>
        </div>
    );
};
