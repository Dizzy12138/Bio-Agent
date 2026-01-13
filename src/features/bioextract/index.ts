/**
 * BioExtract-AI 模块入口
 * 基于数据驱动的生物材料智能筛选助手
 */

// 组件
export { BioExtractChat, LLMConfigModal, ThinkingProcess } from './components';

// Store
export { useBioExtractStore } from './stores/bioextractStore';

// Agent 核心
export {
    BioExtractAgent,
    AGENT_CONFIG,
    type ThinkingStep,
    type ThinkingStepType,
    type AgentContext,
    type AgentResult,
    type AgentCallbacks,
} from './agent';

// API
export { bioextractAPI } from './api/bioextractAPI';

// 数据服务（旧版内存查询）
export {
    dataService,
    type DrugDeliveryRecord,
    type DataSourceStatus,
} from './api/dataService';

// SQLite 数据库服务
export {
    sqliteDb,
    TABLE_SCHEMAS,
    type QueryResult,
    type DatabaseStatus,
} from './api/sqliteDatabase';

// LLM 服务
export {
    callLLM,
    getLLMConfig,
    saveLLMConfig,
    fetchAvailableModels,
    getFallbackModels,
    LLM_PROVIDERS,
    type LLMConfig,
    type ChatMessage,
    type ModelInfo,
} from './api/llmService';

// 类型
export type {
    ATPSRecord,
    PolymerCandidate,
    PolymerTag,
    Modifier,
    DrugDeliveryProfile,
    FilterCriteria,
    FilterStep,
    AgentMessage,
    Recommendation,
    AgentSession,
    ProcessLogEntry,
    FunctionalTagType,
} from './types';
