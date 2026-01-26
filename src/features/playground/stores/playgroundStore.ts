/**
 * Playground Store (Zustand) - Enhanced Version
 * 
 * Manages state for the Information Extraction Playground:
 * - Documents (uploaded files with preview)
 * - Schema definition (dynamically inferred by Agent)
 * - Extracted Data (the main output table)
 * - Visual Grounding state
 * - Correction History (for HITL feedback loop)
 * - Agent Integration state
 */

import { create } from 'zustand';
import type { LLMConfig } from '../../bioextract/api/llmService';
import type { ThinkingStep } from '../../bioextract/agent/BioExtractAgent';

// ======================================
// Type Definitions
// ======================================

export interface DocumentFile {
    id: string;
    name: string;
    type: 'image' | 'pdf';
    /** Data URL or object URL for display */
    url: string;
    /** Original file reference for re-processing */
    file?: File;
    /** Base64 content for sending to VLM */
    base64?: string;
    /** Extracted text content from OCR */
    extractedText?: string;
}

export interface SchemaField {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
    required: boolean;
    description?: string;
}

export interface ExtractedRow {
    documentId: string;
    /** Keyed by field name from Schema */
    values: Record<string, ExtractedCell>;
}

export interface ExtractedCell {
    value: string | number | null;
    /** 0-1 confidence score */
    confidence: number;
    /** Bounding box for visual grounding [x, y, width, height] as % of image */
    boundingBox?: [number, number, number, number];
    /** Whether user has corrected this cell */
    corrected?: boolean;
    /** Original value before correction (for HITL tracking) */
    originalValue?: string | number | null;
}

export interface VisualGroundingState {
    documentId: string | null;
    fieldName: string | null;
    boundingBox: [number, number, number, number] | null;
}

/** HITL Correction Record for feedback loop */
export interface CorrectionRecord {
    id: string;
    documentId: string;
    fieldName: string;
    originalValue: string | number | null;
    correctedValue: string | number;
    timestamp: Date;
}

/** Chat Message for Agent interaction */
export interface PlaygroundMessage {
    id: string;
    role: 'user' | 'agent' | 'system';
    content: string;
    timestamp: Date;
    /** Associated thinking steps if from agent */
    thinkingSteps?: ThinkingStep[];
}

/** OCR Processing State */
export interface OCRQueueItem {
    id: string;
    file: File;
    fileName: string;
    fileSize: number;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number;
    extractedText?: string;
    error?: string;
}

export interface OCRBatchProgress {
    total: number;
    completed: number;
    failed: number;
    currentFile?: string;
}

export interface PlaygroundState {
    // Documents
    documents: DocumentFile[];
    activeDocumentId: string | null;

    // Schema (dynamically inferred)
    schema: SchemaField[];
    schemaInferred: boolean;

    // Extracted Data
    extractedRows: ExtractedRow[];

    // Visual Grounding
    visualGrounding: VisualGroundingState;

    // HITL Corrections
    correctionHistory: CorrectionRecord[];

    // Chat/Agent
    messages: PlaygroundMessage[];
    isProcessing: boolean;
    thinkingSteps: ThinkingStep[];

    // LLM Config
    llmConfig: LLMConfig | null;

    // OCR State (NEW)
    ocrQueue: OCRQueueItem[];
    ocrBatchProgress: OCRBatchProgress | null;
    isOCRProcessing: boolean;

    // Actions - Documents
    addDocument: (doc: DocumentFile) => void;
    addDocuments: (docs: DocumentFile[]) => void;
    removeDocument: (id: string) => void;
    setActiveDocument: (id: string | null) => void;
    clearDocuments: () => void;

    // Actions - Schema
    setSchema: (schema: SchemaField[]) => void;
    addSchemaField: (field: SchemaField) => void;
    removeSchemaField: (name: string) => void;
    setSchemaInferred: (val: boolean) => void;

    // Actions - Extracted Data
    setExtractedRows: (rows: ExtractedRow[]) => void;
    addExtractedRow: (row: ExtractedRow) => void;
    updateCell: (documentId: string, fieldName: string, newValue: string | number) => void;

    // Actions - Visual Grounding
    setVisualGrounding: (grounding: VisualGroundingState) => void;
    clearVisualGrounding: () => void;

    // Actions - Chat/Agent
    addMessage: (msg: PlaygroundMessage) => void;
    setMessages: (msgs: PlaygroundMessage[]) => void;
    setIsProcessing: (val: boolean) => void;
    setThinkingSteps: (steps: ThinkingStep[]) => void;
    addThinkingStep: (step: ThinkingStep) => void;
    clearThinkingSteps: () => void;

    // Actions - LLM
    setLLMConfig: (config: LLMConfig | null) => void;

    // Actions - OCR (NEW)
    addToOCRQueue: (files: File[]) => void;
    updateOCRQueueItem: (id: string, updates: Partial<OCRQueueItem>) => void;
    removeFromOCRQueue: (id: string) => void;
    clearOCRQueue: () => void;
    setOCRBatchProgress: (progress: OCRBatchProgress | null) => void;
    setIsOCRProcessing: (val: boolean) => void;

    // Convenience
    loadSampleData: () => void;
    reset: () => void;
}

// ======================================
// Sample Data for Demo
// ======================================

const SAMPLE_DOCUMENTS: DocumentFile[] = [
    {
        id: 'doc-1',
        name: 'Invoice_001.png',
        type: 'image',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/ReceiptSwiss.jpg/220px-ReceiptSwiss.jpg',
    },
    {
        id: 'doc-2',
        name: 'Invoice_002.png',
        type: 'image',
        url: 'https://www.invoicesimple.com/wp-content/uploads/2018/06/Sample-Invoice-printable.png',
    },
];

const SAMPLE_SCHEMA: SchemaField[] = [
    { name: 'vendor', type: 'string', required: true, description: 'Vendor or company name' },
    { name: 'date', type: 'date', required: true, description: 'Invoice date' },
    { name: 'total', type: 'number', required: true, description: 'Total amount in currency' },
    { name: 'currency', type: 'string', required: false, description: 'Currency code' },
];

const SAMPLE_EXTRACTED_ROWS: ExtractedRow[] = [
    {
        documentId: 'doc-1',
        values: {
            vendor: { value: 'Restaurant du Commerce', confidence: 0.92, boundingBox: [10, 5, 40, 8] },
            date: { value: '2023-04-15', confidence: 0.88, boundingBox: [60, 5, 25, 6] },
            total: { value: 45.5, confidence: 0.95, boundingBox: [70, 80, 20, 8] },
            currency: { value: 'CHF', confidence: 0.98, boundingBox: [60, 80, 8, 8] },
        },
    },
    {
        documentId: 'doc-2',
        values: {
            vendor: { value: 'East Repair Inc.', confidence: 0.97, boundingBox: [5, 10, 35, 6] },
            date: { value: '2019-02-11', confidence: 0.75, boundingBox: [70, 10, 20, 5] },
            total: { value: 154.06, confidence: 0.60, boundingBox: [75, 70, 18, 6] },
            currency: { value: 'USD', confidence: 0.99, boundingBox: [60, 70, 10, 6] },
        },
    },
];

const INITIAL_MESSAGES: PlaygroundMessage[] = [
    {
        id: 'welcome',
        role: 'agent',
        content: '👋 欢迎使用信息提取 Playground！\n\n请上传文档，然后告诉我您想提取什么信息。例如：\n- "提取发票中的供应商、日期和金额"\n- "识别合同中的甲方、乙方和签约日期"',
        timestamp: new Date(),
    },
];

// ======================================
// Create Store
// ======================================

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
    // Initial State
    documents: [],
    activeDocumentId: null,
    schema: [],
    schemaInferred: false,
    extractedRows: [],
    visualGrounding: { documentId: null, fieldName: null, boundingBox: null },
    correctionHistory: [],
    messages: INITIAL_MESSAGES,
    isProcessing: false,
    thinkingSteps: [],
    llmConfig: null,

    // OCR State
    ocrQueue: [],
    ocrBatchProgress: null,
    isOCRProcessing: false,

    // Document Actions
    addDocument: (doc) =>
        set((state) => ({
            documents: [...state.documents, doc],
            activeDocumentId: state.activeDocumentId ?? doc.id,
        })),

    addDocuments: (docs) =>
        set((state) => ({
            documents: [...state.documents, ...docs],
            activeDocumentId: state.activeDocumentId ?? docs[0]?.id ?? null,
        })),

    removeDocument: (id) =>
        set((state) => ({
            documents: state.documents.filter((d) => d.id !== id),
            activeDocumentId: state.activeDocumentId === id
                ? (state.documents.find(d => d.id !== id)?.id ?? null)
                : state.activeDocumentId,
            extractedRows: state.extractedRows.filter((r) => r.documentId !== id),
        })),

    setActiveDocument: (id) => set({ activeDocumentId: id }),

    clearDocuments: () => set({
        documents: [],
        activeDocumentId: null,
        extractedRows: [],
        schema: [],
        schemaInferred: false,
    }),

    // Schema Actions
    setSchema: (schema) => set({ schema }),

    addSchemaField: (field) =>
        set((state) => ({
            schema: [...state.schema.filter(f => f.name !== field.name), field],
        })),

    removeSchemaField: (name) =>
        set((state) => ({
            schema: state.schema.filter((f) => f.name !== name),
        })),

    setSchemaInferred: (val) => set({ schemaInferred: val }),

    // Extracted Data Actions
    setExtractedRows: (rows) => set({ extractedRows: rows }),

    addExtractedRow: (row) =>
        set((state) => ({
            extractedRows: [...state.extractedRows.filter(r => r.documentId !== row.documentId), row],
        })),

    updateCell: (documentId, fieldName, newValue) =>
        set((state) => {
            const existingRow = state.extractedRows.find(r => r.documentId === documentId);
            const existingCell = existingRow?.values[fieldName];
            const originalValue = existingCell?.originalValue ?? existingCell?.value ?? null;

            // Record correction for HITL
            const correction: CorrectionRecord = {
                id: `corr-${Date.now()}`,
                documentId,
                fieldName,
                originalValue,
                correctedValue: newValue,
                timestamp: new Date(),
            };

            return {
                extractedRows: state.extractedRows.map((row) => {
                    if (row.documentId !== documentId) return row;
                    return {
                        ...row,
                        values: {
                            ...row.values,
                            [fieldName]: {
                                ...row.values[fieldName],
                                value: newValue,
                                corrected: true,
                                confidence: 1.0,
                                originalValue,
                            },
                        },
                    };
                }),
                correctionHistory: [...state.correctionHistory, correction],
            };
        }),

    // Visual Grounding Actions
    setVisualGrounding: (grounding) => set({ visualGrounding: grounding }),
    clearVisualGrounding: () =>
        set({ visualGrounding: { documentId: null, fieldName: null, boundingBox: null } }),

    // Chat/Agent Actions
    addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

    setMessages: (msgs) => set({ messages: msgs }),

    setIsProcessing: (val) => set({ isProcessing: val }),

    setThinkingSteps: (steps) => set({ thinkingSteps: steps }),

    addThinkingStep: (step) =>
        set((state) => ({ thinkingSteps: [...state.thinkingSteps, step] })),

    clearThinkingSteps: () => set({ thinkingSteps: [] }),

    // LLM Config
    setLLMConfig: (config) => set({ llmConfig: config }),

    // Convenience
    loadSampleData: () =>
        set({
            documents: SAMPLE_DOCUMENTS,
            activeDocumentId: SAMPLE_DOCUMENTS[0].id,
            schema: SAMPLE_SCHEMA,
            schemaInferred: true,
            extractedRows: SAMPLE_EXTRACTED_ROWS,
        }),

    // OCR Actions
    addToOCRQueue: (files) =>
        set((state) => {
            const newItems: OCRQueueItem[] = files.map((file) => ({
                id: `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                file,
                fileName: file.name,
                fileSize: file.size,
                status: 'pending' as const,
                progress: 0,
            }));
            return { ocrQueue: [...state.ocrQueue, ...newItems] };
        }),

    updateOCRQueueItem: (id, updates) =>
        set((state) => ({
            ocrQueue: state.ocrQueue.map((item) =>
                item.id === id ? { ...item, ...updates } : item
            ),
        })),

    removeFromOCRQueue: (id) =>
        set((state) => ({
            ocrQueue: state.ocrQueue.filter((item) => item.id !== id),
        })),

    clearOCRQueue: () => set({ ocrQueue: [], ocrBatchProgress: null }),

    setOCRBatchProgress: (progress) => set({ ocrBatchProgress: progress }),

    setIsOCRProcessing: (val) => set({ isOCRProcessing: val }),

    reset: () =>
        set({
            documents: [],
            activeDocumentId: null,
            schema: [],
            schemaInferred: false,
            extractedRows: [],
            visualGrounding: { documentId: null, fieldName: null, boundingBox: null },
            correctionHistory: [],
            messages: INITIAL_MESSAGES,
            isProcessing: false,
            thinkingSteps: [],
            ocrQueue: [],
            ocrBatchProgress: null,
            isOCRProcessing: false,
        }),
}));

export default usePlaygroundStore;
