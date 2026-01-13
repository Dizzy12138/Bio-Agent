import React, { useState } from 'react';
import type { CategoryNode } from '../types';
import './CategoryTree.css';

interface CategoryTreeProps {
    categories: CategoryNode[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
    categories,
    selectedId,
    onSelect,
}) => {
    return (
        <div className="category-tree">
            {categories.map(category => (
                <CategoryNodeItem
                    key={category.id}
                    node={category}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    level={0}
                />
            ))}
        </div>
    );
};

interface CategoryNodeItemProps {
    node: CategoryNode;
    selectedId: string | null;
    onSelect: (id: string) => void;
    level: number;
}

const CategoryNodeItem: React.FC<CategoryNodeItemProps> = ({
    node,
    selectedId,
    onSelect,
    level,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedId === node.id;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleSelect = () => {
        onSelect(node.id);
    };

    return (
        <div className="category-node">
            <div
                className={`category-node-content ${isSelected ? 'active' : ''}`}
                onClick={handleSelect}
                style={{ paddingLeft: `${12 + level * 12}px` }}
            >
                <button
                    className={`category-expand-btn ${isExpanded ? 'expanded' : ''} ${!hasChildren ? 'hidden' : ''}`}
                    onClick={handleToggle}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                        <polyline points="9,18 15,12 9,6" />
                    </svg>
                </button>

                <span className="category-icon">{node.icon}</span>
                <span className="category-label">{node.name}</span>

                {node.count !== undefined && (
                    <span className="category-count">{node.count}</span>
                )}
            </div>

            {hasChildren && isExpanded && (
                <div className="category-children">
                    {node.children!.map(child => (
                        <CategoryNodeItem
                            key={child.id}
                            node={child}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
