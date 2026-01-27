import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Target } from 'lucide-react';
import type { GraphData, GraphNode, EntityType } from '../types';
import './NetworkGraph.css';

interface NetworkGraphProps {
    data: GraphData;
    selectedNodeId?: string;
    onNodeClick?: (node: GraphNode) => void;
    onNodeHover?: (node: GraphNode | null) => void;
}

// 实体类型颜色映射
const COLORS: Record<EntityType, string> = {
    gene: '#8b5cf6',
    drug: '#f59e0b',
    disease: '#ef4444',
    protein: '#06b6d4',
    pathway: '#22c55e',
    organism: '#ec4899'
};

/**
 * NetworkGraph - 知识图谱网络可视化
 * 
 * 使用 Canvas 渲染节点和边，支持缩放、平移、点击交互
 * 连线粗细代表关联强度
 */
export const NetworkGraph: React.FC<NetworkGraphProps> = ({
    data,
    selectedNodeId,
    onNodeClick,
    onNodeHover
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

    // 居中显示
    const centerGraph = useCallback(() => {
        if (!data.nodes.length) return;

        const minX = Math.min(...data.nodes.map(n => n.x));
        const maxX = Math.max(...data.nodes.map(n => n.x));
        const minY = Math.min(...data.nodes.map(n => n.y));
        const maxY = Math.max(...data.nodes.map(n => n.y));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const canvas = canvasRef.current;
        if (canvas) {
            setOffset({
                x: canvas.width / 2 - centerX * scale,
                y: canvas.height / 2 - centerY * scale
            });
        }
    }, [data.nodes, scale]);

    // 渲染图谱
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 保存状态
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);

        // 绘制边
        data.edges.forEach(edge => {
            const source = data.nodes.find(n => n.id === edge.source);
            const target = data.nodes.find(n => n.id === edge.target);
            if (!source || !target) return;

            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = `rgba(156, 163, 175, ${0.3 + edge.weight * 0.5})`;
            ctx.lineWidth = 1 + edge.weight * 3;
            ctx.stroke();
        });

        // 绘制节点
        data.nodes.forEach(node => {
            const isSelected = node.id === selectedNodeId;
            const isHovered = node.id === hoveredNode?.id;
            const radius = node.size * (isSelected || isHovered ? 1.2 : 1);

            // 节点外圈光晕
            if (isSelected || isHovered) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);
                ctx.fillStyle = `${COLORS[node.type]}33`;
                ctx.fill();
            }

            // 节点主体
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

            // 渐变填充
            const gradient = ctx.createRadialGradient(
                node.x - radius * 0.3, node.y - radius * 0.3, 0,
                node.x, node.y, radius
            );
            gradient.addColorStop(0, COLORS[node.type]);
            gradient.addColorStop(1, `${COLORS[node.type]}cc`);
            ctx.fillStyle = gradient;
            ctx.fill();

            // 边框
            ctx.strokeStyle = isSelected ? '#fff' : `${COLORS[node.type]}88`;
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.stroke();

            // 标签
            ctx.font = `${isSelected ? 'bold ' : ''}${12 / scale > 8 ? 12 : 12 / scale}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'var(--text-primary, #1f2937)';
            ctx.fillText(node.label, node.x, node.y + radius + 6);
        });

        ctx.restore();
    }, [data, scale, offset, selectedNodeId, hoveredNode]);

    // 初始化和响应式调整
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

    // 数据变化时重新渲染
    useEffect(() => {
        render();
    }, [render]);

    // 初始居中
    useEffect(() => {
        centerGraph();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在节点数量变化时触发居中
    }, [data.nodes.length]);

    // 鼠标事件处理
    const getNodeAtPosition = (x: number, y: number): GraphNode | null => {
        const canvasX = (x - offset.x) / scale;
        const canvasY = (y - offset.y) / scale;

        for (const node of data.nodes) {
            const distance = Math.sqrt(
                Math.pow(canvasX - node.x, 2) + Math.pow(canvasY - node.y, 2)
            );
            if (distance <= node.size) {
                return node;
            }
        }
        return null;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const node = getNodeAtPosition(x, y);

        if (node) {
            onNodeClick?.(node);
        } else {
            setDragging(true);
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        if (dragging) {
            setOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        } else {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const node = getNodeAtPosition(x, y);

            if (node !== hoveredNode) {
                setHoveredNode(node);
                onNodeHover?.(node);
            }
        }
    };

    const handleMouseUp = () => {
        setDragging(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(prev => Math.max(0.2, Math.min(3, prev * delta)));
    };

    // 缩放控制
    const zoomIn = () => setScale(prev => Math.min(3, prev * 1.2));
    const zoomOut = () => setScale(prev => Math.max(0.2, prev / 1.2));
    const resetView = () => {
        setScale(1);
        centerGraph();
    };

    // 空状态
    if (data.nodes.length === 0) {
        return (
            <div className="network-graph network-graph--empty">
                <div className="network-graph__empty-content">
                    <div className="network-graph__empty-icon">🕸️</div>
                    <h3>暂无图谱数据</h3>
                    <p>请输入关键词进行文献挖掘</p>
                </div>
            </div>
        );
    }

    return (
        <div className="network-graph" ref={containerRef}>
            <canvas
                ref={canvasRef}
                className="network-graph__canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{ cursor: dragging ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }}
            />

            {/* 控制栏 */}
            <div className="network-graph__controls">
                <button onClick={zoomIn} title="放大">
                    <ZoomIn size={18} />
                </button>
                <button onClick={zoomOut} title="缩小">
                    <ZoomOut size={18} />
                </button>
                <button onClick={resetView} title="重置视图">
                    <Maximize2 size={18} />
                </button>
                <button onClick={centerGraph} title="居中">
                    <Target size={18} />
                </button>
            </div>

            {/* 悬浮提示 */}
            {hoveredNode && (
                <div
                    className="network-graph__tooltip"
                    style={{
                        left: hoveredNode.x * scale + offset.x + 20,
                        top: hoveredNode.y * scale + offset.y - 10
                    }}
                >
                    <span
                        className="network-graph__tooltip-type"
                        style={{ background: COLORS[hoveredNode.type] }}
                    >
                        {hoveredNode.type}
                    </span>
                    <span className="network-graph__tooltip-label">{hoveredNode.label}</span>
                </div>
            )}

            {/* 图例 */}
            <div className="network-graph__legend">
                {Object.entries(COLORS).map(([type, color]) => (
                    <div key={type} className="network-graph__legend-item">
                        <span className="network-graph__legend-dot" style={{ background: color }} />
                        <span>{type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
