import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}) => {
    return (
        <button
            className={`btn btn-${variant} btn-${size} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="btn-spinner" />
            ) : (
                <>
                    {leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
                    {children}
                    {rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
                </>
            )}
        </button>
    );
};
