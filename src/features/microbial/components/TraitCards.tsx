import React from 'react';
import { CheckCircle, XCircle, Shield } from 'lucide-react';
import type { TraitGroup, Trait, AntibioticResistance } from '../types';
import { TRAIT_CATEGORIES } from '../types';
import './TraitCards.css';

interface TraitCardsProps {
    traits: TraitGroup[];
    resistances: AntibioticResistance[];
    loading?: boolean;
}

/**
 * TraitCards - 性状卡片组
 * 
 * 展示微生物的形态、生理、代谢、抗性等特征
 */
export const TraitCards: React.FC<TraitCardsProps> = ({
    traits,
    resistances,
    loading = false
}) => {
    // Loading 状态
    if (loading) {
        return (
            <div className="trait-cards trait-cards--loading">
                {[1, 2, 3].map(i => (
                    <div key={i} className="trait-card trait-card--skeleton">
                        <div className="trait-card__skeleton-header" />
                        <div className="trait-card__skeleton-content" />
                    </div>
                ))}
            </div>
        );
    }

    // 空状态
    if (traits.length === 0) {
        return (
            <div className="trait-cards trait-cards--empty">
                <div className="trait-cards__empty-icon">📋</div>
                <p>暂无性状数据</p>
            </div>
        );
    }

    // 渲染单个性状值
    const renderTraitValue = (trait: Trait) => {
        if (typeof trait.value === 'boolean') {
            return trait.value ? (
                <span className="trait-value trait-value--yes">
                    <CheckCircle size={14} /> 是
                </span>
            ) : (
                <span className="trait-value trait-value--no">
                    <XCircle size={14} /> 否
                </span>
            );
        }

        return (
            <span className="trait-value">
                {trait.value}
                {trait.unit && <small> {trait.unit}</small>}
            </span>
        );
    };

    return (
        <div className="trait-cards">
            {/* 性状分组卡片 */}
            {traits.map(group => {
                const categoryConfig = TRAIT_CATEGORIES[group.category];
                return (
                    <div key={group.category} className="trait-card">
                        <header
                            className="trait-card__header"
                            style={{ borderColor: categoryConfig.color }}
                        >
                            <span className="trait-card__icon">{categoryConfig.icon}</span>
                            <h4 className="trait-card__title">{categoryConfig.label}</h4>
                        </header>
                        <div className="trait-card__content">
                            {group.traits.map(trait => (
                                <div key={trait.id} className="trait-item">
                                    <span className="trait-item__name">
                                        {trait.icon && <span className="trait-item__icon">{trait.icon}</span>}
                                        {trait.name}
                                    </span>
                                    {renderTraitValue(trait)}
                                    {trait.confidence !== undefined && trait.confidence < 0.9 && (
                                        <span className="trait-item__confidence">
                                            {Math.round(trait.confidence * 100)}%
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* 抗生素抗性卡片 */}
            {resistances.length > 0 && (
                <div className="trait-card trait-card--resistance">
                    <header
                        className="trait-card__header"
                        style={{ borderColor: TRAIT_CATEGORIES.resistance.color }}
                    >
                        <span className="trait-card__icon">💊</span>
                        <h4 className="trait-card__title">抗生素抗性谱</h4>
                    </header>
                    <div className="trait-card__content">
                        <div className="resistance-grid">
                            {resistances.map((item, index) => (
                                <div
                                    key={index}
                                    className={`resistance-item ${item.resistant ? 'resistant' : 'susceptible'}`}
                                >
                                    <div className="resistance-item__header">
                                        <span className="resistance-item__name">{item.antibiotic}</span>
                                        <span className="resistance-item__status">
                                            {item.resistant ? (
                                                <><Shield size={12} /> 耐药</>
                                            ) : (
                                                <><CheckCircle size={12} /> 敏感</>
                                            )}
                                        </span>
                                    </div>
                                    {item.mic && (
                                        <div className="resistance-item__mic">
                                            MIC: {item.mic} μg/mL
                                        </div>
                                    )}
                                    {item.gene && (
                                        <div className="resistance-item__gene">
                                            基因: {item.gene}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
