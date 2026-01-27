import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    className = '',
    id,
    ...props
}) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
        <div className={`input-wrapper ${className}`}>
            {label && (
                <label htmlFor={inputId} className="input-label">
                    {label}
                </label>
            )}
            <div className={`input-container ${error ? 'input-error' : ''}`}>
                {leftIcon && <span className="input-icon-left">{leftIcon}</span>}
                <input
                    id={inputId}
                    className={`input-field ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''}`}
                    {...props}
                />
                {rightIcon && <span className="input-icon-right">{rightIcon}</span>}
            </div>
            {(error || helperText) && (
                <span className={`input-helper ${error ? 'input-helper-error' : ''}`}>
                    {error || helperText}
                </span>
            )}
        </div>
    );
};

// TextArea Component
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
    label,
    error,
    helperText,
    className = '',
    id,
    ...props
}) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    return (
        <div className={`input-wrapper ${className}`}>
            {label && (
                <label htmlFor={textareaId} className="input-label">
                    {label}
                </label>
            )}
            <textarea
                id={textareaId}
                className={`textarea-field ${error ? 'input-error' : ''}`}
                {...props}
            />
            {(error || helperText) && (
                <span className={`input-helper ${error ? 'input-helper-error' : ''}`}>
                    {error || helperText}
                </span>
            )}
        </div>
    );
};
