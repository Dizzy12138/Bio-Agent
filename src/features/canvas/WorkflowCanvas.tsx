import React, { useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Panel,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Edge,
    type Node,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodes';
import { NodePalette } from './panels/NodePalette';
import { NodeConfigPanel } from './panels/NodeConfigPanel';
import { CanvasToolbar } from './panels/CanvasToolbar';
import { useWorkflowStore } from '../../stores';
import type { CustomNodeData } from '../../types';
import './WorkflowCanvas.css';

// 默认节点数据模板
const defaultNodeData: Record<string, CustomNodeData> = {
    start: {
        label: '开始',
        inputVariables: [],
        triggerType: 'manual',
    },
    llm: {
        label: 'LLM推理',
        model: '',  // 用户需从配置的 Provider 中选择
        systemPrompt: '',
        userPromptTemplate: '',
        temperature: 0.7,
        maxTokens: 2048,
    },
    tool: {
        label: '科学工具',
        toolId: '',
        toolName: '',
        toolDescription: '',
        toolSchema: {},
        parameterMappings: {},
    },
    router: {
        label: '路由',
        routingStrategy: 'intent',
        routes: [],
    },
    output: {
        label: '输出',
        outputType: 'markdown',
    },
};

export const WorkflowCanvas: React.FC = () => {
    const {
        nodes: storeNodes,
        edges: storeEdges,
        selectedNodeId,
        setNodes: setStoreNodes,
        setEdges: setStoreEdges,
        addNode,
        addEdge: addStoreEdge,
        selectNode,
        setDirty,
    } = useWorkflowStore();

    const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

    // 同步节点到store
    const handleNodesChange = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
        onNodesChange(changes);
        setStoreNodes(nodes);
        setDirty(true);
    }, [onNodesChange, setStoreNodes, nodes, setDirty]);

    // 同步边到store
    const handleEdgesChange = useCallback((changes: Parameters<typeof onEdgesChange>[0]) => {
        onEdgesChange(changes);
        setStoreEdges(edges);
        setDirty(true);
    }, [onEdgesChange, setStoreEdges, edges, setDirty]);

    // 连接回调
    const onConnect = useCallback(
        (connection: Connection) => {
            const newEdge: Edge = {
                id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
                source: connection.source!,
                target: connection.target!,
                sourceHandle: connection.sourceHandle,
                targetHandle: connection.targetHandle,
                animated: true,
                style: { stroke: 'var(--primary-500)', strokeWidth: 2 },
            };
            setEdges((eds) => addEdge(newEdge, eds));
            addStoreEdge(newEdge);
        },
        [setEdges, addStoreEdge]
    );

    // 节点点击
    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            selectNode(node.id);
        },
        [selectNode]
    );

    // 画布点击
    const onPaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    // 拖放处理
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const position = {
                x: event.clientX - 280,
                y: event.clientY - 100,
            };

            const newNode: Node<CustomNodeData> = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: { ...defaultNodeData[type] } as CustomNodeData,
            };

            setNodes((nds) => [...nds, newNode]);
            addNode(newNode);
        },
        [setNodes, addNode]
    );

    // 获取选中的节点
    const selectedNode = useMemo(
        () => nodes.find((n) => n.id === selectedNodeId),
        [nodes, selectedNodeId]
    );

    return (
        <div className="workflow-canvas-container">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypes}
                fitView
                snapToGrid
                snapGrid={[15, 15]}
                defaultEdgeOptions={{
                    animated: true,
                    style: { stroke: 'var(--primary-500)', strokeWidth: 2 },
                }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="var(--neutral-300)"
                />
                <Controls className="canvas-controls" />
                <MiniMap
                    className="canvas-minimap"
                    nodeColor={(node) => {
                        const colors: Record<string, string> = {
                            start: 'var(--node-start)',
                            llm: 'var(--node-llm)',
                            tool: 'var(--node-tool)',
                            router: 'var(--node-router)',
                            output: 'var(--node-output)',
                        };
                        return colors[node.type || 'start'] || 'var(--neutral-400)';
                    }}
                />

                <Panel position="top-left">
                    <NodePalette />
                </Panel>

                <Panel position="top-center">
                    <CanvasToolbar />
                </Panel>
            </ReactFlow>

            {/* 右侧配置面板 */}
            {selectedNode && (
                <NodeConfigPanel
                    node={selectedNode}
                    onClose={() => selectNode(null)}
                />
            )}
        </div>
    );
};
