import React from 'react';
import './Select.css';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    options: SelectOption[];
    error?: string;
    helperText?: string;
    onChange?: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
    label,
    options,
    error,
    helperText,
    className = '',
    id,
    onChange,
    ...props
}) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange?.(e.target.value);
    };

    return (
        <div className={`select-wrapper ${className}`}>
            {label && (
                <label htmlFor={selectId} className="select-label">
                    {label}
                </label>
            )}
            <div className={`select-container ${error ? 'select-error' : ''}`}>
                <select
                    id={selectId}
                    className="select-field"
                    onChange={handleChange}
                    {...props}
                >
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                <span className="select-arrow">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </div>
            {(error || helperText) && (
                <span className={`select-helper ${error ? 'select-helper-error' : ''}`}>
                    {error || helperText}
                </span>
            )}
        </div>
    );
};
