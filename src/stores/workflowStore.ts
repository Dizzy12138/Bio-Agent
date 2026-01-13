import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Node, Edge } from '@xyflow/react';
import type {
    CustomNodeData,
    ExecutionState,
    ExecutionLog,
    ExecutionStatus
} from '../types';

interface WorkflowState {
    // Workflow data
    nodes: Node<CustomNodeData>[];
    edges: Edge[];
    selectedNodeId: string | null;

    // Workflow metadata
    workflowId: string | null;
    workflowName: string;
    workflowDescription: string;
    isDirty: boolean;

    // Execution state
    execution: ExecutionState | null;

    // Node actions
    addNode: (node: Node<CustomNodeData>) => void;
    updateNode: (nodeId: string, data: Partial<CustomNodeData>) => void;
    updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
    removeNode: (nodeId: string) => void;
    selectNode: (nodeId: string | null) => void;

    // Edge actions
    addEdge: (edge: Edge) => void;
    removeEdge: (edgeId: string) => void;

    // Batch updates
    setNodes: (nodes: Node<CustomNodeData>[]) => void;
    setEdges: (edges: Edge[]) => void;

    // Workflow actions
    setWorkflowMeta: (id: string, name: string, description: string) => void;
    clearWorkflow: () => void;
    setDirty: (isDirty: boolean) => void;

    // Execution actions
    startExecution: () => void;
    updateExecutionLog: (log: ExecutionLog) => void;
    setExecutionStatus: (status: ExecutionStatus) => void;
    clearExecution: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
    immer((set) => ({
        // Initial state
        nodes: [],
        edges: [],
        selectedNodeId: null,
        workflowId: null,
        workflowName: '新建工作流',
        workflowDescription: '',
        isDirty: false,
        execution: null,

        // Node actions
        addNode: (node) => set((state) => {
            state.nodes.push(node);
            state.isDirty = true;
        }),

        updateNode: (nodeId, data) => set((state) => {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
                node.data = { ...node.data, ...data } as CustomNodeData;
                state.isDirty = true;
            }
        }),

        updateNodePosition: (nodeId, position) => set((state) => {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
                node.position = position;
            }
        }),

        removeNode: (nodeId) => set((state) => {
            state.nodes = state.nodes.filter(n => n.id !== nodeId);
            state.edges = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
            if (state.selectedNodeId === nodeId) {
                state.selectedNodeId = null;
            }
            state.isDirty = true;
        }),

        selectNode: (nodeId) => set((state) => {
            state.selectedNodeId = nodeId;
        }),

        // Edge actions
        addEdge: (edge) => set((state) => {
            state.edges.push(edge);
            state.isDirty = true;
        }),

        removeEdge: (edgeId) => set((state) => {
            state.edges = state.edges.filter(e => e.id !== edgeId);
            state.isDirty = true;
        }),

        // Batch updates
        setNodes: (nodes) => set((state) => {
            state.nodes = nodes;
        }),

        setEdges: (edges) => set((state) => {
            state.edges = edges;
        }),

        // Workflow actions
        setWorkflowMeta: (id, name, description) => set((state) => {
            state.workflowId = id;
            state.workflowName = name;
            state.workflowDescription = description;
        }),

        clearWorkflow: () => set((state) => {
            state.nodes = [];
            state.edges = [];
            state.selectedNodeId = null;
            state.workflowId = null;
            state.workflowName = '新建工作流';
            state.workflowDescription = '';
            state.isDirty = false;
            state.execution = null;
        }),

        setDirty: (isDirty) => set((state) => {
            state.isDirty = isDirty;
        }),

        // Execution actions
        startExecution: () => set((state) => {
            state.execution = {
                workflowId: state.workflowId || '',
                status: 'running',
                logs: [],
                variables: {},
                startTime: new Date().toISOString(),
            };
        }),

        updateExecutionLog: (log) => set((state) => {
            if (state.execution) {
                const existingIndex = state.execution.logs.findIndex(l => l.id === log.id);
                if (existingIndex >= 0) {
                    state.execution.logs[existingIndex] = log;
                } else {
                    state.execution.logs.push(log);
                }
                state.execution.currentNodeId = log.nodeId;
            }
        }),

        setExecutionStatus: (status) => set((state) => {
            if (state.execution) {
                state.execution.status = status;
                if (status === 'completed' || status === 'error') {
                    state.execution.endTime = new Date().toISOString();
                }
            }
        }),

        clearExecution: () => set((state) => {
            state.execution = null;
        }),
    }))
);
