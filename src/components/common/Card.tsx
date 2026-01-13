import React from 'react';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'outlined';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children,
    variant = 'default',
    padding = 'md',
    className = '',
    ...props
}) => {
    return (
        <div
            className={`card card-${variant} card-padding-${padding} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

// Card Header
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
    title,
    subtitle,
    action,
    className = '',
    ...props
}) => {
    return (
        <div className={`card-header ${className}`} {...props}>
            <div className="card-header-content">
                <h3 className="card-title">{title}</h3>
                {subtitle && <p className="card-subtitle">{subtitle}</p>}
            </div>
            {action && <div className="card-header-action">{action}</div>}
        </div>
    );
};

// Card Body
export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    children,
    className = '',
    ...props
}) => {
    return (
        <div className={`card-body ${className}`} {...props}>
            {children}
        </div>
    );
};

// Card Footer
export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    children,
    className = '',
    ...props
}) => {
    return (
        <div className={`card-footer ${className}`} {...props}>
            {children}
        </div>
    );
};
