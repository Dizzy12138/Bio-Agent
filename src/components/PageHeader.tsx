import React from 'react';
import './PageHeader.css';

interface PageHeaderProps {
    icon: string;
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}

/**
 * PageHeader - 统一的页面头部组件
 * 
 * 为所有模块提供一致的页面标题样式
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
    icon,
    title,
    subtitle,
    children
}) => {
    return (
        <header className="page-header">
            <div className="page-header__info">
                <div className="page-header__icon">{icon}</div>
                <div className="page-header__text">
                    <h1 className="page-header__title">{title}</h1>
                    {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
                </div>
            </div>
            {children && (
                <div className="page-header__actions">
                    {children}
                </div>
            )}
        </header>
    );
};
