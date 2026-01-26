/**
 * PlaygroundChat Component (Enhanced with Agent Integration)
 * 
 * Key Features:
 * 1. Connects to BioExtractAgent for real LLM interaction
 * 2. Supports Schema Induction from natural language
 * 3. Triggers document extraction
 * 4. Shows thinking steps in real-time
 * 5. Uses configurable prompts from Agent Management
 */

import React, { useState, useRef, useEffect } from 'react';
import { usePlaygroundStore, type PlaygroundMessage, type SchemaField, type ExtractedRow, type ExtractedCell } from '../stores/playgroundStore';
import { getLLMConfig, callLLM, type ChatMessage } from '../../bioextract/api/llmService';
import { ThinkingProcess } from '../../bioextract/components/ThinkingProcess';
import { getAgentPrompt, PLAYGROUND_SCHEMA_PROMPT } from '../../experts/templates';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import './PlaygroundChat.css';

// 获取当前配置的系统提示词（支持 localStorage 覆盖）
function getPlaygroundPrompt(): string {
    return getAgentPrompt('system-playground-schema-agent') || PLAYGROUND_SCHEMA_PROMPT;
}

export const PlaygroundChat: React.FC = () => {
    const {
        messages,
        addMessage,
        documents,
        activeDocumentId,
        schema,
        setSchema,
        setSchemaInferred,
        addExtractedRow,
        isProcessing,
        setIsProcessing,
        thinkingSteps,
        addThinkingStep,
        clearThinkingSteps,
    } = usePlaygroundStore();

    const [input, setInput] = useState('');
    const [showThinking, setShowThinking] = useState(true);
    const [pendingSchema, setPendingSchema] = useState<SchemaField[] | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinkingSteps]);

    // Handle confirm schema (apply pending schema to store)
    const handleConfirmSchema = () => {
        if (pendingSchema && pendingSchema.length > 0) {
            setSchema(pendingSchema);
            setSchemaInferred(true);
            setPendingSchema(null);
            addMessage({
                id: `msg-${Date.now()}-confirm`,
                role: 'system',
                content: `✅ 已确认并应用 ${pendingSchema.length} 个字段到 Schema`,
                timestamp: new Date(),
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const userInput = input.trim();
        setInput('');

        // Add user message
        const userMsg: PlaygroundMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: userInput,
            timestamp: new Date(),
        };
        addMessage(userMsg);

        // Check LLM config
        const llmConfig = getLLMConfig();
        if (!llmConfig) {
            addMessage({
                id: `msg-${Date.now()}-err`,
                role: 'system',
                content: '⚠️ 请先在 BioExtract-AI 页面配置 LLM API Key',
                timestamp: new Date(),
            });
            return;
        }

        setIsProcessing(true);
        clearThinkingSteps();

        try {
            // Build messages for LLM
            const llmMessages: ChatMessage[] = [
                { role: 'system', content: getPlaygroundPrompt() },
            ];

            // Add context about current state
            let contextMsg = '';
            if (activeDocumentId) {
                const activeDoc = documents.find(d => d.id === activeDocumentId);
                if (activeDoc) {
                    contextMsg += `\n当前正在查看文档: ${activeDoc.name}`;
                    if (activeDoc.extractedText) {
                        // LIMIT context size to avoid token overflow, e.g. first 50000 chars
                        const textPreview = activeDoc.extractedText.slice(0, 50000);
                        contextMsg += `\n\n--- 文档原始内容 (Markdown) ---\n${textPreview}\n--- 文档内容结束 ---\n`;
                        if (activeDoc.extractedText.length > 50000) {
                            contextMsg += `\n(注: 文档内容过长，仅展示前 50000 字符)`;
                        }
                    } else {
                        contextMsg += `\n(文档尚未进行 OCR 处理，无文本内容)`;
                    }
                }
            } else if (documents.length > 0) {
                contextMsg += `\n当前已上传 ${documents.length} 个文档，但未选择特定文档。`;
            }

            if (schema.length > 0) {
                contextMsg += `\n当前 Schema: ${JSON.stringify(schema)}`;
            }
            if (contextMsg) {
                llmMessages.push({ role: 'user', content: `[系统上下文]${contextMsg}` });
                llmMessages.push({ role: 'assistant', content: '了解，我会根据提供的文档内容和当前状态来处理。' });
            }

            // Add user message
            llmMessages.push({ role: 'user', content: userInput });

            // Add thinking step
            addThinkingStep({
                id: `step-${Date.now()}`,
                type: 'analyzing',
                content: '分析用户请求...',
                timestamp: new Date(),
            });

            // Call LLM
            const response = await callLLM(llmConfig, llmMessages);
            const content = response.content;

            // Parse response
            const parsed = parseAgentResponse(content);

            // Handle Schema Induction - store as pending for user confirmation
            if (parsed.schema) {
                addThinkingStep({
                    id: `step-${Date.now()}-schema`,
                    type: 'planning',
                    content: `推断出 ${parsed.schema.length} 个字段，等待确认`,
                    timestamp: new Date(),
                });
                setPendingSchema(parsed.schema);
            }

            // Handle Extraction
            if (parsed.extraction && activeDocumentId) {
                addThinkingStep({
                    id: `step-${Date.now()}-extract`,
                    type: 'reasoning',
                    content: '提取数据成功',
                    timestamp: new Date(),
                });

                const row: ExtractedRow = {
                    documentId: activeDocumentId,
                    values: parsed.extraction,
                };
                addExtractedRow(row);
            }

            // Add agent response
            const agentMsg: PlaygroundMessage = {
                id: `msg-${Date.now()}-agent`,
                role: 'agent',
                content: parsed.answer || formatSchemaResponse(parsed.schema) || '处理完成',
                timestamp: new Date(),
                thinkingSteps: [...thinkingSteps],
            };
            addMessage(agentMsg);

        } catch (error) {
            const errMsg = error instanceof Error ? error.message : '未知错误';
            addMessage({
                id: `msg-${Date.now()}-err`,
                role: 'system',
                content: `❌ 错误: ${errMsg}`,
                timestamp: new Date(),
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Quick action: Infer schema from documents
    const handleInferSchema = async () => {
        if (documents.length === 0) {
            addMessage({
                id: `msg-${Date.now()}`,
                role: 'system',
                content: '⚠️ 请先上传文档',
                timestamp: new Date(),
            });
            return;
        }

        // Build context from document names
        const docNames = documents.map(d => d.name).join(', ');
        const suggestedPrompt = `我上传了以下文档: ${docNames}。请根据文档类型帮我设计需要提取的字段结构（Schema）`;
        setInput(suggestedPrompt);

        // Auto-submit after setting input
        setTimeout(() => {
            const form = document.querySelector('.chat-input-area') as HTMLFormElement;
            form?.requestSubmit();
        }, 100);
    };

    // Quick action: Manual schema definition helper
    const handleDefineSchema = async () => {
        const commonTypes = `请告诉我您想从文档中提取什么信息？例如：
- "提取发票中的供应商名称、日期和金额"
- "提取论文的标题、作者和发表年份"
- "提取表格中的第一列和第二列"`;

        addMessage({
            id: `msg-${Date.now()}`,
            role: 'agent',
            content: commonTypes,
            timestamp: new Date(),
        });
    };

    // Quick action: Extract data from current document using schema
    const handleExtractData = async () => {
        // Check prerequisites
        if (!activeDocumentId) {
            addMessage({
                id: `msg-${Date.now()}`,
                role: 'system',
                content: '⚠️ 请先选择一个文档',
                timestamp: new Date(),
            });
            return;
        }

        if (schema.length === 0) {
            addMessage({
                id: `msg-${Date.now()}`,
                role: 'system',
                content: '⚠️ 请先定义提取字段（Schema）',
                timestamp: new Date(),
            });
            return;
        }

        const activeDoc = documents.find(d => d.id === activeDocumentId);
        if (!activeDoc?.extractedText) {
            addMessage({
                id: `msg-${Date.now()}`,
                role: 'system',
                content: '⚠️ 该文档尚未完成 OCR 处理，请先处理文档',
                timestamp: new Date(),
            });
            return;
        }

        // Build extraction prompt
        const schemaDescription = schema.map(f =>
            `- ${f.name} (${f.type}${f.required ? ', 必填' : ''}): ${f.description || '无描述'}`
        ).join('\n');

        const extractionPrompt = `请根据以下 Schema 从文档内容中提取数据：

## 提取字段
${schemaDescription}

## 文档内容
${activeDoc.extractedText.substring(0, 30000)}

## 输出要求
请以 <extraction> 标签输出 JSON 格式的提取结果，每个字段包含 value 和 confidence：
<extraction>
{
  "field_name": {"value": "提取的值", "confidence": 0.9}
}
</extraction>

如果某个字段无法从文档中提取，请将 value 设为 null，confidence 设为 0。`;

        setInput(extractionPrompt);

        // Auto-submit
        setTimeout(() => {
            const form = document.querySelector('.chat-input-area') as HTMLFormElement;
            form?.requestSubmit();
        }, 100);
    };

    return (
        <div className="playground-chat">
            <div className="chat-header">
                <div className="chat-title">
                    <Sparkles size={16} />
                    <h3>Agent Chat</h3>
                </div>
                <div className="chat-actions">
                    <button
                        className="quick-action"
                        onClick={handleInferSchema}
                        disabled={isProcessing || documents.length === 0}
                        title="自动推断 Schema"
                    >
                        🔍 推断字段
                    </button>
                    <button
                        className="quick-action"
                        onClick={handleDefineSchema}
                        disabled={isProcessing}
                        title="帮我定义字段"
                    >
                        💡 帮我定义
                    </button>
                    {pendingSchema && pendingSchema.length > 0 && (
                        <button
                            className="quick-action confirm-schema"
                            onClick={handleConfirmSchema}
                            title="确认并应用字段"
                        >
                            ✅ 确认字段 ({pendingSchema.length})
                        </button>
                    )}
                    {schema.length > 0 && activeDocumentId && (
                        <button
                            className="quick-action extract-data"
                            onClick={handleExtractData}
                            disabled={isProcessing}
                            title="从当前文档提取数据"
                        >
                            📥 提取数据
                        </button>
                    )}
                </div>
            </div>

            <div className="pg-chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`pg-message pg-message--${msg.role}`}>
                        <div className="pg-message-avatar">
                            {msg.role === 'agent' ? '🤖' : msg.role === 'user' ? '👤' : '⚙️'}
                        </div>
                        <div className="pg-message-bubble">
                            <div className="pg-message-text">
                                {msg.role === 'user' ? (
                                    msg.content
                                ) : (
                                    <MessageContent content={msg.content} />
                                )}
                            </div>
                            <span className="pg-message-time">
                                {msg.timestamp.toLocaleTimeString('zh-CN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        </div>
                    </div>
                ))}

                {/* Thinking Process */}
                {(isProcessing || thinkingSteps.length > 0) && (
                    <ThinkingProcess
                        steps={thinkingSteps}
                        isThinking={isProcessing}
                        collapsed={!showThinking}
                        onToggle={() => setShowThinking(!showThinking)}
                    />
                )}

                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="描述您想提取的信息，例如：提取发票中的供应商、日期和金额"
                    disabled={isProcessing}
                />
                <button type="submit" disabled={isProcessing || !input.trim()}>
                    {isProcessing ? <Loader2 size={18} className="spinning" /> : <Send size={18} />}
                </button>
            </form>
        </div>
    );
};

// ========== Helper Functions ==========

interface ParsedResponse {
    schema?: SchemaField[];
    extraction?: Record<string, ExtractedCell>;
    answer?: string;
}

function parseAgentResponse(content: string): ParsedResponse {
    const result: ParsedResponse = {};

    // Parse schema - try multiple patterns
    const schemaMatch = content.match(/<schema>([\s\S]*?)<\/schema>/i);
    if (schemaMatch) {
        try {
            result.schema = JSON.parse(schemaMatch[1].trim());
        } catch (e) {
            console.warn('Failed to parse schema:', e);
        }
    }

    // Also try to find JSON array that looks like a schema (fallback)
    if (!result.schema) {
        const jsonArrayMatch = content.match(/\[\s*\{\s*"name"\s*:/);
        if (jsonArrayMatch) {
            // Try to extract the JSON array
            const startIdx = content.indexOf('[');
            let bracketCount = 0;
            let endIdx = startIdx;
            for (let i = startIdx; i < content.length; i++) {
                if (content[i] === '[') bracketCount++;
                if (content[i] === ']') bracketCount--;
                if (bracketCount === 0) {
                    endIdx = i + 1;
                    break;
                }
            }
            try {
                const jsonStr = content.substring(startIdx, endIdx);
                const parsed = JSON.parse(jsonStr);
                if (Array.isArray(parsed) && parsed[0]?.name && parsed[0]?.type) {
                    result.schema = parsed;
                }
            } catch (e) {
                // Ignore parse errors for fallback
            }
        }
    }

    // Second fallback: Parse JSON code block with nested schema object
    // Format: ```json { "schema": { "field_name": { "type": "string", ... }, ... } } ```
    if (!result.schema) {
        const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
            try {
                const jsonContent = jsonBlockMatch[1].trim();
                const parsed = JSON.parse(jsonContent);

                // Check for nested schema object format
                if (parsed.schema && typeof parsed.schema === 'object') {
                    const schemaFields: SchemaField[] = [];
                    for (const [fieldName, fieldDef] of Object.entries(parsed.schema)) {
                        const def = fieldDef as { type?: string; description?: string; required?: boolean };
                        // Map complex types to simple types
                        let simpleType: SchemaField['type'] = 'string';
                        if (def.type) {
                            if (def.type === 'array' || def.type.startsWith('array')) simpleType = 'array';
                            else if (def.type === 'object') simpleType = 'object';
                            else if (def.type === 'number' || def.type === 'integer') simpleType = 'number';
                            else if (def.type === 'boolean') simpleType = 'boolean';
                            else simpleType = 'string';
                        }
                        schemaFields.push({
                            name: fieldName,
                            type: simpleType,
                            required: def.required ?? false,
                            description: def.description,
                        });
                    }
                    if (schemaFields.length > 0) {
                        console.log('[Parser] Extracted schema from JSON code block:', schemaFields);
                        result.schema = schemaFields;
                    }
                }
            } catch (e) {
                console.warn('[Parser] Failed to parse JSON code block:', e);
            }
        }
    }

    // Third fallback: Extract fields from natural language patterns
    // Agent outputs formats like: 1. **`document_title` (文本)**: description
    if (!result.schema) {
        const nlFields: SchemaField[] = [];
        const typeMap: Record<string, SchemaField['type']> = {
            '文本': 'string', 'string': 'string', 'text': 'string',
            '数字': 'number', 'number': 'number', '数值': 'number',
            '日期': 'date', 'date': 'date',
            '布尔': 'boolean', 'boolean': 'boolean',
            '对象': 'object', 'object': 'object', '文本对象': 'object',
            '列表': 'array', 'array': 'array', '对象列表': 'array', '文本列表': 'array',
        };

        // Pattern 1: **`field_name` (类型)**: or **`field_name`** (类型):
        // Matches: 1.  **`document_title` (文本)**: description
        const pattern1 = /\d+\.\s+\*\*`([a-z_]+)`\s*\(([^)]+)\)\*\*\s*[:：]/gi;
        let match;
        while ((match = pattern1.exec(content)) !== null) {
            const fieldName = match[1].toLowerCase();
            const rawType = match[2].toLowerCase().trim();
            const fieldType = typeMap[rawType] || 'string';
            if (!nlFields.find(f => f.name === fieldName)) {
                nlFields.push({ name: fieldName, type: fieldType, required: false });
            }
        }

        // Pattern 2: **`field_name`** (类型): - asterisks around backticks
        const pattern2 = /\d+\.\s+\*\*`([a-z_]+)`\*\*\s*\(([^)]+)\)\s*[:：]/gi;
        while ((match = pattern2.exec(content)) !== null) {
            const fieldName = match[1].toLowerCase();
            const rawType = match[2].toLowerCase().trim();
            const fieldType = typeMap[rawType] || 'string';
            if (!nlFields.find(f => f.name === fieldName)) {
                nlFields.push({ name: fieldName, type: fieldType, required: false });
            }
        }

        // Pattern 3: More permissive - just numbered list with backtick field
        // Matches: 1. `field_name`: or **field_name**:
        const pattern3 = /\d+\.\s+(?:\*\*)?`?([a-z][a-z0-9_]*)`?(?:\*\*)?\s*(?:\([^)]*\))?\s*[:：]/gi;
        while ((match = pattern3.exec(content)) !== null) {
            const fieldName = match[1].toLowerCase();
            // Skip common non-field words and very short names
            if (['示例', 'example', 'note', '注意', '说明', 'tag', 'url'].includes(fieldName)) continue;
            if (fieldName.length < 3) continue;
            if (!nlFields.find(f => f.name === fieldName)) {
                nlFields.push({ name: fieldName, type: 'string', required: false });
            }
        }

        if (nlFields.length >= 3) {
            console.log('[Parser] Extracted fields from natural language:', nlFields);
            result.schema = nlFields;
        }
    }

    // Parse extraction
    const extractionMatch = content.match(/<extraction>([\s\S]*?)<\/extraction>/i);
    if (extractionMatch) {
        try {
            const rawData = JSON.parse(extractionMatch[1].trim());
            result.extraction = {};
            for (const [key, val] of Object.entries(rawData)) {
                const v = val as { value: unknown; confidence?: number };
                // Serialize nested objects/arrays to JSON string for display
                let displayValue: string | number | null = null;
                if (v.value === null || v.value === undefined) {
                    displayValue = null;
                } else if (typeof v.value === 'object') {
                    displayValue = JSON.stringify(v.value);
                } else {
                    displayValue = v.value as string | number;
                }
                result.extraction[key] = {
                    value: displayValue,
                    confidence: v.confidence ?? 0.5,
                };
            }
        } catch (e) {
            console.warn('Failed to parse extraction:', e);
        }
    }

    // Fallback: Parse extraction from JSON code block (when no <extraction> tag)
    if (!result.extraction) {
        const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
            try {
                const rawData = JSON.parse(jsonBlockMatch[1].trim());
                // Check if this looks like extraction data (has value/confidence structure)
                const keys = Object.keys(rawData);
                if (keys.length > 0) {
                    result.extraction = {};
                    for (const [key, val] of Object.entries(rawData)) {
                        let displayValue: string | number | null = null;
                        let confidence = 0.5;

                        // Handle both {value, confidence} and direct value formats
                        if (val && typeof val === 'object' && 'value' in (val as object)) {
                            const v = val as { value: unknown; confidence?: number };
                            confidence = v.confidence ?? 0.5;
                            if (v.value === null || v.value === undefined) {
                                displayValue = null;
                            } else if (typeof v.value === 'object') {
                                displayValue = JSON.stringify(v.value);
                            } else {
                                displayValue = v.value as string | number;
                            }
                        } else {
                            // Direct value format
                            if (val === null || val === undefined) {
                                displayValue = null;
                            } else if (typeof val === 'object') {
                                displayValue = JSON.stringify(val);
                            } else {
                                displayValue = val as string | number;
                            }
                        }

                        result.extraction[key] = {
                            value: displayValue,
                            confidence,
                        };
                    }
                    console.log('[Parser] Extracted data from JSON code block:', result.extraction);
                }
            } catch (e) {
                // Ignore JSON parse errors for fallback
            }
        }
    }

    // Parse answer
    const answerMatch = content.match(/<answer>([\s\S]*?)<\/answer>/i);
    if (answerMatch) {
        result.answer = answerMatch[1].trim();
    }

    // If schema was found, remove it from answer and clean up
    if (result.schema && !result.answer) {
        // Remove schema tags and JSON from content for display
        let cleanContent = content
            .replace(/<schema>[\s\S]*?<\/schema>/gi, '')
            .replace(/```json[\s\S]*?```/g, '')
            .trim();

        if (cleanContent) {
            result.answer = cleanContent;
        }
    }

    // If no structured output, treat whole content as answer
    if (!result.schema && !result.extraction && !result.answer) {
        result.answer = content;
    }

    return result;
}

function formatSchemaResponse(schema?: SchemaField[]): string {
    if (!schema || schema.length === 0) return '';

    const lines = ['✅ 已推断出以下字段结构：', ''];
    schema.forEach((f, i) => {
        const req = f.required ? ' (必填)' : '';
        const desc = f.description ? ` - ${f.description}` : '';
        lines.push(`${i + 1}. ${f.name} [${f.type}]${req}${desc}`);
    });
    lines.push('', '您可以直接输入信息进行提取。');
    return lines.join('\n');
}

// Component for rendering formatted message content
const MessageContent: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');
    return (
        <>
            {lines.map((line, i) => (
                <React.Fragment key={i}>
                    {line}
                    {i < lines.length - 1 && <br />}
                </React.Fragment>
            ))}
        </>
    );
};

export default PlaygroundChat;
