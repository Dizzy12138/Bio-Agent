import React from 'react';
import type { PhylogeneticNode } from '../types';
import './PhylogeneticTree.css';

interface PhylogeneticTreeProps {
    data: PhylogeneticNode | null;
    loading?: boolean;
}

/**
 * PhylogeneticTree - 系统发育树
 * 
 * 展示微生物的进化位置和近缘物种
 */
export const PhylogeneticTree: React.FC<PhylogeneticTreeProps> = ({
    data,
    loading = false
}) => {
    // 递归渲染树节点
    const renderNode = (node: PhylogeneticNode, depth: number = 0): React.ReactNode => {
        const hasChildren = node.children && node.children.length > 0;
        const indent = depth * 24;

        return (
            <div key={node.id} className="phylo-node">
                {/* 节点行 */}
                <div
                    className={`phylo-node__row ${node.highlighted ? 'highlighted' : ''}`}
                    style={{ paddingLeft: indent }}
                >
                    {/* 连接线 */}
                    <div className="phylo-node__branch">
                        <div
                            className="phylo-node__branch-line"
                            style={{ width: Math.max(20, node.branchLength * 50) }}
                        />
                        <div className="phylo-node__branch-dot" />
                    </div>

                    {/* 节点内容 */}
                    <div className="phylo-node__content">
                        <span className="phylo-node__name">
                            {node.name}
                        </span>
                        {node.scientificName && (
                            <span className="phylo-node__scientific">
                                {node.scientificName}
                            </span>
                        )}
                    </div>

                    {/* 高亮标记 */}
                    {node.highlighted && (
                        <span className="phylo-node__current">当前物种</span>
                    )}
                </div>

                {/* 子节点 */}
                {hasChildren && (
                    <div className="phylo-node__children">
                        {node.children!.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    // Loading 状态
    if (loading) {
        return (
            <div className="phylo-tree phylo-tree--loading">
                <div className="phylo-tree__skeleton">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="phylo-tree__skeleton-node" style={{ marginLeft: i * 20 }} />
                    ))}
                </div>
            </div>
        );
    }

    // 空状态
    if (!data) {
        return (
            <div className="phylo-tree phylo-tree--empty">
                <div className="phylo-tree__empty-icon">🌳</div>
                <h3>系统发育树</h3>
                <p>选择微生物后显示进化关系</p>
            </div>
        );
    }

    return (
        <div className="phylo-tree">
            <header className="phylo-tree__header">
                <h4>🌳 系统发育树</h4>
            </header>
            <div className="phylo-tree__content">
                {renderNode(data)}
            </div>
        </div>
    );
};
