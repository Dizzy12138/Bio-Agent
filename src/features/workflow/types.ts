// Workflow Management Types

export interface SavedWorkflow {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    thumbnail?: string;
    isTemplate: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    nodeCount: number;
    edgeCount: number;
    status: 'draft' | 'published' | 'archived';
}

export interface WorkflowVersion {
    id: string;
    workflowId: string;
    version: number;
    versionLabel?: string;
    description: string;
    changes: string[];
    createdAt: string;
    createdBy: string;
    nodeSnapshot: string; // JSON string
    edgeSnapshot: string; // JSON string
}

export interface ExecutionRecord {
    id: string;
    workflowId: string;
    workflowName: string;
    status: 'running' | 'completed' | 'error' | 'cancelled';
    startTime: string;
    endTime?: string;
    duration?: number; // milliseconds
    initiatedBy: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    logs: ExecutionNodeLog[];
}

export interface ExecutionNodeLog {
    id: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
    startTime?: string;
    endTime?: string;
    duration?: number;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    llmTokens?: {
        prompt: number;
        completion: number;
        total: number;
    };
}

export interface WorkflowFilter {
    search: string;
    category: string | null;
    status: SavedWorkflow['status'] | null;
    isTemplate: boolean | null;
    sortBy: 'name' | 'updatedAt' | 'createdAt' | 'version';
    sortOrder: 'asc' | 'desc';
}

export interface WorkflowCategory {
    id: string;
    name: string;
    icon: string;
    count: number;
}

export interface WorkflowSaveData {
    name: string;
    description: string;
    category: string;
    tags: string[];
    versionNote: string;
}

