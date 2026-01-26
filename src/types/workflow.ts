// Node Types
export type NodeType = 'start' | 'llm' | 'tool' | 'router' | 'output';

// Base interface for all node data - required for @xyflow/react compatibility
interface BaseNodeData {
  [key: string]: unknown;
}

// Start Node
export interface StartNodeData extends BaseNodeData {
  label: string;
  inputVariables: InputVariable[];
  triggerType: 'manual' | 'scheduled' | 'api';
}

export interface InputVariable {
  id: string;
  name: string;
  type: 'text' | 'file' | 'json' | 'number';
  required: boolean;
  description?: string;
  defaultValue?: string;
}

// LLM Reasoning Node
export interface LLMNodeData extends BaseNodeData {
  label: string;
  model: 'gpt-4' | 'gpt-4o' | 'claude-3.5-sonnet' | 'llama-3' | 'gemini-pro';
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
  maxTokens: number;
  outputSchema?: Record<string, unknown>;
  categoryBinding?: string;
}

// Scientific Tool Node
export interface ToolNodeData extends BaseNodeData {
  label: string;
  toolId: string;
  toolName: string;
  toolDescription: string;
  toolSchema: Record<string, unknown>;
  parameterMappings: Record<string, string>;
}

// Router Node
export interface RouterNodeData extends BaseNodeData {
  label: string;
  routingStrategy: 'intent' | 'condition' | 'llm';
  routes: Route[];
  defaultRoute?: string;
}

export interface Route {
  id: string;
  condition: string;
  targetNodeId: string;
  label?: string;
}

// Output Node
export interface OutputNodeData extends BaseNodeData {
  label: string;
  outputType: 'text' | 'markdown' | 'json' | 'generative-ui';
  template?: string;
  uiComponents?: UIComponentConfig[];
}

export interface UIComponentConfig {
  type: 'table' | 'chart' | 'card' | 'citation';
  dataSource: string;
  config: Record<string, unknown>;
}

// Union type for all node data
export type CustomNodeData =
  | StartNodeData
  | LLMNodeData
  | ToolNodeData
  | RouterNodeData
  | OutputNodeData;


// Workflow Types
export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  category?: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: CustomNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
}

// Execution Types
export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'paused';

export interface ExecutionLog {
  id: string;
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime: string;
  endTime?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface ExecutionState {
  workflowId: string;
  status: ExecutionStatus;
  currentNodeId?: string;
  logs: ExecutionLog[];
  variables: Record<string, unknown>;
  startTime?: string;
  endTime?: string;
}
