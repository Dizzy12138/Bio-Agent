import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, Maximize2, Grid3x3, Layers } from 'lucide-react';
import type { Molecule, ViewerMode } from '../types';
import './MoleculeViewer.css';

interface MoleculeViewerProps {
    molecule: Molecule | null;
    loading?: boolean;
}

/**
 * MoleculeViewer - 分子 2D/3D 查看器
 * 
 * 简化版实现：
 * - 2D 模式显示化学式和基本信息
 * - 3D 模式显示一个占位可视化
 * 
 * 注：完整 3D 实现需要集成 3Dmol.js 或 NGL Viewer
 */
export const MoleculeViewer: React.FC<MoleculeViewerProps> = ({
    molecule,
    loading = false
}) => {
    const [mode, setMode] = useState<ViewerMode>('2D');
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // 处理 3D 旋转（简化版动画）
    useEffect(() => {
        if (mode !== '3D') return;

        const interval = setInterval(() => {
            setRotation(prev => ({
                x: prev.x,
                y: (prev.y + 1) % 360
            }));
        }, 50);

        return () => clearInterval(interval);
    }, [mode]);

    // Loading 状态
    if (loading) {
        return (
            <div className="molecule-viewer molecule-viewer--loading">
                <div className="molecule-viewer__skeleton">
                    <div className="molecule-viewer__skeleton-circle" />
                    <div className="molecule-viewer__skeleton-text" />
                </div>
            </div>
        );
    }

    // 空状态
    if (!molecule) {
        return (
            <div className="molecule-viewer molecule-viewer--empty">
                <div className="molecule-viewer__empty-content">
                    <div className="molecule-viewer__empty-icon">🧪</div>
                    <h3>等待分子输入</h3>
                    <p>请输入 SMILES 字符串以可视化分子结构</p>
                </div>
            </div>
        );
    }

    return (
        <div className="molecule-viewer" ref={containerRef}>
            {/* 工具栏 */}
            <div className="molecule-viewer__toolbar">
                <div className="molecule-viewer__mode-toggle">
                    <button
                        className={`molecule-viewer__mode-btn ${mode === '2D' ? 'active' : ''}`}
                        onClick={() => setMode('2D')}
                    >
                        <Grid3x3 size={16} />
                        2D
                    </button>
                    <button
                        className={`molecule-viewer__mode-btn ${mode === '3D' ? 'active' : ''}`}
                        onClick={() => setMode('3D')}
                    >
                        <Layers size={16} />
                        3D
                    </button>
                </div>

                <div className="molecule-viewer__actions">
                    <button className="molecule-viewer__action-btn" title="重置视图">
                        <RotateCw size={16} />
                    </button>
                    <button className="molecule-viewer__action-btn" title="全屏">
                        <Maximize2 size={16} />
                    </button>
                </div>
            </div>

            {/* 分子信息头 */}
            <div className="molecule-viewer__info">
                <h3 className="molecule-viewer__name">{molecule.name}</h3>
                <code className="molecule-viewer__formula">{molecule.formula}</code>
            </div>

            {/* 可视化区域 */}
            <div className="molecule-viewer__canvas">
                {mode === '2D' ? (
                    // 2D 模式：显示化学式和 SMILES
                    <div className="molecule-viewer__2d">
                        <div className="molecule-viewer__structure-placeholder">
                            <div className="molecule-viewer__hexagon-grid">
                                {[...Array(7)].map((_, i) => (
                                    <div key={i} className="molecule-viewer__hexagon" />
                                ))}
                            </div>
                            <span className="molecule-viewer__formula-large">{molecule.formula}</span>
                        </div>
                    </div>
                ) : (
                    // 3D 模式：简化版旋转动画
                    <div
                        className="molecule-viewer__3d"
                        style={{
                            transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
                        }}
                    >
                        <div className="molecule-viewer__3d-model">
                            {/* 简化的分子模型表示 */}
                            <div className="molecule-viewer__atom molecule-viewer__atom--center" />
                            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                                <div
                                    key={i}
                                    className="molecule-viewer__atom molecule-viewer__atom--orbital"
                                    style={{
                                        transform: `rotate(${angle}deg) translateX(60px)`
                                    }}
                                />
                            ))}
                            <svg className="molecule-viewer__bonds" viewBox="0 0 200 200">
                                {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                                    const rad = (angle * Math.PI) / 180;
                                    return (
                                        <line
                                            key={i}
                                            x1="100"
                                            y1="100"
                                            x2={100 + Math.cos(rad) * 60}
                                            y2={100 + Math.sin(rad) * 60}
                                            stroke="var(--neutral-400)"
                                            strokeWidth="3"
                                        />
                                    );
                                })}
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* SMILES 显示 */}
            <div className="molecule-viewer__smiles">
                <span className="molecule-viewer__smiles-label">SMILES:</span>
                <code className="molecule-viewer__smiles-value">{molecule.smiles}</code>
            </div>
        </div>
    );
};
