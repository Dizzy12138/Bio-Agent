import React, { useCallback } from 'react';
import type { RangeFilter } from '../types';
import './RangeSlider.css';

interface RangeSliderProps {
    filter: RangeFilter;
    onChange: (min: number, max: number) => void;
}

/**
 * RangeSlider - 范围滑动选择器
 * 
 * 支持双滑块选择数值范围，实时显示当前值
 * 用于分子量、年份等连续数值的筛选
 */
export const RangeSlider: React.FC<RangeSliderProps> = ({ filter, onChange }) => {
    const { id, label, min, max, currentMin, currentMax, unit, step = 1 } = filter;

    // 计算滑块位置百分比
    const minPercent = ((currentMin - min) / (max - min)) * 100;
    const maxPercent = ((currentMax - min) / (max - min)) * 100;

    const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.min(Number(e.target.value), currentMax - step);
        onChange(value, currentMax);
    }, [currentMax, step, onChange]);

    const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(Number(e.target.value), currentMin + step);
        onChange(currentMin, value);
    }, [currentMin, step, onChange]);

    // 格式化显示值
    const formatValue = (value: number) => {
        if (unit === 'year') {
            return value.toString();
        }
        return value.toLocaleString() + (unit ? ` ${unit}` : '');
    };

    return (
        <div className="range-slider" data-filter-id={id}>
            <div className="range-slider__header">
                <span className="range-slider__label">{label}</span>
                <span className="range-slider__values">
                    {formatValue(currentMin)} — {formatValue(currentMax)}
                </span>
            </div>

            <div className="range-slider__track-container">
                {/* 背景轨道 */}
                <div className="range-slider__track" />

                {/* 选中范围高亮 */}
                <div
                    className="range-slider__range"
                    style={{
                        left: `${minPercent}%`,
                        width: `${maxPercent - minPercent}%`
                    }}
                />

                {/* 最小值滑块 */}
                <input
                    type="range"
                    className="range-slider__input range-slider__input--min"
                    min={min}
                    max={max}
                    step={step}
                    value={currentMin}
                    onChange={handleMinChange}
                    aria-label={`${label} minimum value`}
                />

                {/* 最大值滑块 */}
                <input
                    type="range"
                    className="range-slider__input range-slider__input--max"
                    min={min}
                    max={max}
                    step={step}
                    value={currentMax}
                    onChange={handleMaxChange}
                    aria-label={`${label} maximum value`}
                />
            </div>

            <div className="range-slider__bounds">
                <span>{formatValue(min)}</span>
                <span>{formatValue(max)}</span>
            </div>
        </div>
    );
};
