export { StartNode } from './StartNode';
export { LLMNode } from './LLMNode';
export { ToolNode } from './ToolNode';
export { RouterNode } from './RouterNode';
export { OutputNode } from './OutputNode';

import type { NodeTypes } from '@xyflow/react';
import { StartNode } from './StartNode';
import { LLMNode } from './LLMNode';
import { ToolNode } from './ToolNode';
import { RouterNode } from './RouterNode';
import { OutputNode } from './OutputNode';

export const nodeTypes: NodeTypes = {
    start: StartNode,
    llm: LLMNode,
    tool: ToolNode,
    router: RouterNode,
    output: OutputNode,
};
