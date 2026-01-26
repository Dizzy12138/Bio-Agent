import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { Pathway, PathwayNode } from '../types';
import { PATHWAY_NODE_COLORS } from '../types';
import './PathwayMap.css';

interface PathwayMapProps {
    pathway: Pathway | null;
    loading?: boolean;
}

/**
 * PathwayMap - 代谢通路图
 * 
 * 可视化展示代谢通路，高亮微生物具备的酶/基因节点
 */
export const PathwayMap: React.FC<PathwayMapProps> = ({
    pathway,
    loading = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [hoveredNode, setHoveredNode] = useState<PathwayNode | null>(null);

    // 渲染通路图
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !pathway) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);

        // 绘制边
        pathway.edges.forEach(edge => {
            const source = pathway.nodes.find(n => n.id === edge.source);
            const target = pathway.nodes.find(n => n.id === edge.target);
            if (!source || !target) return;

            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = source.present && target.present
                ? 'var(--accent-500)'
                : 'var(--neutral-300)';
            ctx.lineWidth = source.present && target.present ? 2 : 1;
            ctx.setLineDash(source.present && target.present ? [] : [4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // 绘制箭头
            const angle = Math.atan2(target.y - source.y, target.x - source.x);
            const arrowSize = 8;
            const arrowX = target.x - 15 * Math.cos(angle);
            const arrowY = target.y - 15 * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
                arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
                arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
                arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fillStyle = source.present && target.present
                ? 'var(--accent-500)'
                : 'var(--neutral-300)';
            ctx.fill();
        });

        // 绘制节点
        pathway.nodes.forEach(node => {
            const radius = node.type === 'enzyme' ? 20 : 15;
            const color = PATHWAY_NODE_COLORS[node.type];
            const isHovered = hoveredNode?.id === node.id;

            // 节点背景
            ctx.beginPath();
            if (node.type === 'metabolite') {
                // 圆形
                ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            } else {
                // 圆角矩形
                const w = radius * 2;
                const h = radius * 1.5;
                ctx.roundRect(node.x - w / 2, node.y - h / 2, w, h, 4);
            }

            ctx.fillStyle = node.present
                ? (isHovered ? color : `${color}dd`)
                : 'var(--neutral-200)';
            ctx.fill();

            ctx.strokeStyle = node.present ? color : 'var(--neutral-400)';
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.stroke();

            // 节点标签
            ctx.font = `${10 / scale > 8 ? 10 : 10}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.present ? '#fff' : 'var(--text-muted)';

            const label = node.label.length > 6 ? node.label.slice(0, 6) + '…' : node.label;
            ctx.fillText(label, node.x, node.y);
        });

        ctx.restore();
    }, [pathway, scale, offset, hoveredNode]);

    // 画布大小调整
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resize = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            render();
        };

        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [render]);

    useEffect(() => {
        render();
    }, [render]);

    // 鼠标事件
    const getNodeAtPosition = (x: number, y: number): PathwayNode | null => {
        if (!pathway) return null;
        const canvasX = (x - offset.x) / scale;
        const canvasY = (y - offset.y) / scale;

        for (const node of pathway.nodes) {
            const radius = node.type === 'enzyme' ? 20 : 15;
            const distance = Math.sqrt(
                Math.pow(canvasX - node.x, 2) + Math.pow(canvasY - node.y, 2)
            );
            if (distance <= radius) {
                return node;
            }
        }
        return null;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const node = getNodeAtPosition(e.clientX - rect.left, e.clientY - rect.top);
        setHoveredNode(node);
    };

    const zoomIn = () => setScale(prev => Math.min(3, prev * 1.2));
    const zoomOut = () => setScale(prev => Math.max(0.3, prev / 1.2));
    const resetView = () => {
        setScale(1);
        setOffset({ x: 50, y: 50 });
    };

    // Loading 状态
    if (loading) {
        return (
            <div className="pathway-map pathway-map--loading">
                <div className="pathway-map__skeleton" />
            </div>
        );
    }

    // 空状态
    if (!pathway) {
        return (
            <div className="pathway-map pathway-map--empty">
                <div className="pathway-map__empty-icon">🧫</div>
                <h3>选择代谢通路</h3>
                <p>从列表中选择一个通路进行可视化</p>
            </div>
        );
    }

    return (
        <div className="pathway-map" ref={containerRef}>
            {/* 头部信息 */}
            <header className="pathway-map__header">
                <div className="pathway-map__title">
                    <h4>{pathway.name}</h4>
                    <span className="pathway-map__completeness">
                        完整度: {pathway.completeness}%
                    </span>
                </div>
                <div className="pathway-map__controls">
                    <button onClick={zoomIn} title="放大"><ZoomIn size={16} /></button>
                    <button onClick={zoomOut} title="缩小"><ZoomOut size={16} /></button>
                    <button onClick={resetView} title="重置"><Maximize2 size={16} /></button>
                </div>
            </header>

            {/* 画布 */}
            <canvas
                ref={canvasRef}
                className="pathway-map__canvas"
                onMouseMove={handleMouseMove}
                style={{ cursor: hoveredNode ? 'pointer' : 'grab' }}
            />

            {/* 悬浮提示 */}
            {hoveredNode && (
                <div
                    className="pathway-map__tooltip"
                    style={{
                        left: hoveredNode.x * scale + offset.x + 20,
                        top: hoveredNode.y * scale + offset.y
                    }}
                >
                    <div className="pathway-map__tooltip-header">
                        <span
                            className="pathway-map__tooltip-type"
                            style={{ background: PATHWAY_NODE_COLORS[hoveredNode.type] }}
                        >
                            {hoveredNode.type}
                        </span>
                        <span className={`pathway-map__tooltip-status ${hoveredNode.present ? 'present' : 'absent'}`}>
                            {hoveredNode.present ? '✓ 存在' : '✗ 缺失'}
                        </span>
                    </div>
                    <div className="pathway-map__tooltip-label">{hoveredNode.label}</div>
                    {hoveredNode.externalId && (
                        <div className="pathway-map__tooltip-id">{hoveredNode.externalId}</div>
                    )}
                </div>
            )}

            {/* 图例 */}
            <div className="pathway-map__legend">
                <div className="pathway-map__legend-section">
                    <span className="pathway-map__legend-title">节点类型</span>
                    {Object.entries(PATHWAY_NODE_COLORS).map(([type, color]) => (
                        <div key={type} className="pathway-map__legend-item">
                            <span className="pathway-map__legend-dot" style={{ background: color }} />
                            <span>{type}</span>
                        </div>
                    ))}
                </div>
                <div className="pathway-map__legend-section">
                    <span className="pathway-map__legend-title">状态</span>
                    <div className="pathway-map__legend-item">
                        <span className="pathway-map__legend-line solid" />
                        <span>激活</span>
                    </div>
                    <div className="pathway-map__legend-item">
                        <span className="pathway-map__legend-line dashed" />
                        <span>缺失</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
