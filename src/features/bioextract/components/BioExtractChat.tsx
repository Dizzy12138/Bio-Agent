import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBioExtractStore } from '../stores/bioextractStore';
import { ThinkingProcess } from './ThinkingProcess';
import type { ThinkingStep } from '../agent';
import { Send, Settings, Database, Server, Terminal, ChevronRight, Search, Dna, Pipette, MessageSquare, Plus } from 'lucide-react';
import { Button } from '../../../components/common';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { bioextractAPI } from '../api/bioextractAPI';
import { getLLMConfig, callLLM, type ChatMessage as LLMChatMessage } from '../api/llmService';
import type { AgentMessage } from '../types';

/**
 * 每条消息独立的思考过程组件（自带展开/收起状态）
 * 默认收起，用户可以独立展开每条消息的思路
 */
const MessageThinking: React.FC<{ steps: ThinkingStep[] }> = ({ steps }) => {
    const [collapsed, setCollapsed] = useState(true);
    return (
        <ThinkingProcess
            steps={steps}
            isThinking={false}
            collapsed={collapsed}
            onToggle={() => setCollapsed(prev => !prev)}
        />
    );
};

// 预设的快捷命令
const QUICK_COMMANDS = [
    {
        label: '查找 pH 响应载体',
        description: '查找具有 pH 响应机制的载体设计',
        prompt: '请从 drug_delivery.csv 数据库中查找具有 pH 响应机制的载体设计。列出相关的聚合物名称、载体形态和释放动力学特征。',
        icon: <Search size={16} />
    },
    {
        label: 'PEG 相关方案',
        description: '聚乙二醇衍生物药物递送方案',
        prompt: '查找数据库中所有使用 PEG（聚乙二醇）或其衍生物的药物递送方案。分析其载体形态、响应机制和释放特性。',
        icon: <Dna size={16} />
    },
    {
        label: '水凝胶载体推荐',
        description: '口服药物递送水凝胶设计',
        prompt: '基于数据库中的水凝胶（Hydrogel）载体案例，为口服药物递送推荐合适的水凝胶设计方案。考虑 pH 响应性和胃肠道保护。',
        icon: <Pipette size={16} />
    }
];

interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export const BioExtractChat: React.FC = () => {
    const {
        session,
        isProcessing,
        llmConfigured,
        processLog,
        showProcessLog,
        thinkingSteps,
        isThinking,
        showThinking,
        initSession,
        addUserMessage,
        sendToAgent,
        toggleProcessLog,
        toggleThinking,
        backendStats,
        backendConnected,
        knowledgeStats,
    } = useBioExtractStore();

    const [inputValue, setInputValue] = useState('');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [showConversations, setShowConversations] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const logEndRef = useRef<HTMLDivElement>(null);
    const initCalledRef = useRef(false);
    const navigate = useNavigate();


    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages, thinkingSteps, isThinking]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [processLog]);

    // 初始化会话（使用 ref 防止 React StrictMode 重复调用）
    useEffect(() => {
        if (!session && !initCalledRef.current) {
            initCalledRef.current = true;
            initSession();
        }
    }, [session, initSession]);

    // 加载历史对话列表
    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const data = await bioextractAPI.getConversations();
            setConversations(data);
        } catch (error) {
            console.error('加载对话列表失败:', error);
        }
    };

    // 创建新对话
    const handleNewConversation = async () => {
        try {
            const newConv = await bioextractAPI.createConversation();
            setCurrentConversationId(newConv.id);
            setConversations([newConv, ...conversations]);

            // 重新初始化会话
            await initSession();
        } catch (error) {
            console.error('创建新对话失败:', error);
        }
    };

    // 选择历史对话
    const handleSelectConversation = async (conversationId: string) => {
        try {
            setCurrentConversationId(conversationId);

            // 获取历史消息
            const history = await bioextractAPI.getConversationHistory(conversationId);

            // 使用 setState 更新消息,确保触发 React 重新渲染
            const currentSession = useBioExtractStore.getState().session;
            if (currentSession) {
                // 过滤掉系统消息,只保留用户和助手的消息
                const historicalMessages: AgentMessage[] = history
                    .filter((msg: any) => msg.role !== 'system')
                    .map((msg: any) => ({
                        id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                        role: msg.role === 'assistant' ? 'agent' : msg.role,
                        content: msg.content,
                        timestamp: new Date(msg.timestamp || Date.now()),
                    }));

                // 保留当前的系统消息
                const systemMessages = currentSession.messages.filter(m => m.role === 'system');

                // 使用 setState 更新整个 session 对象
                useBioExtractStore.setState({
                    session: {
                        ...currentSession,
                        messages: [...systemMessages, ...historicalMessages]
                    }
                });
            }
        } catch (error) {
            console.error('加载对话历史失败:', error);
        }
    };

    // 自动生成对话标题
    const generateAndUpdateTitle = async (convId: string, userInput: string) => {
        // 1. 先立即设置一个基于用户输入的简单标题（保证标题一定存在）
        const fallbackTitle = userInput.length > 20 ? userInput.slice(0, 20) + '...' : userInput;
        try {
            await bioextractAPI.updateConversation(convId, { title: fallbackTitle });
            loadConversations();
        } catch (err) {
            console.warn('设置初始标题失败:', err);
        }

        // 2. 异步尝试用 LLM 生成更好的标题（可选升级）
        try {
            const config = getLLMConfig();
            if (!config) return;

            // 从 store 获取最新的 agent 回复
            const latestSession = useBioExtractStore.getState().session;
            const agentMessages = latestSession?.messages.filter(m => m.role === 'agent') || [];
            const lastAgentMsg = agentMessages[agentMessages.length - 1];
            const aiResponse = lastAgentMsg?.content || '';

            const titleMessages: LLMChatMessage[] = [
                {
                    role: 'system',
                    content: '你是一个标题生成器。根据用户的问题和AI的回答，生成一个简洁的对话标题。'
                        + '要求：1) 不超过20个字；2) 直接输出标题文字，不要加引号或其他标点；'
                        + '3) 用中文；4) 概括对话主题。',
                },
                {
                    role: 'user',
                    content: `用户问题：${userInput.slice(0, 200)}\n\nAI回答：${aiResponse.slice(0, 300)}\n\n请生成标题：`,
                },
            ];

            const result = await callLLM(config, titleMessages);
            let title = result.content.trim().replace(/^["'《]+|["'》]+$/g, '').trim();
            if (title) {
                title = title.slice(0, 30);
                await bioextractAPI.updateConversation(convId, { title });
                loadConversations();
            }
        } catch (error) {
            console.warn('LLM 标题生成失败（已使用回退标题）:', error);
            // 不需要额外处理 —— 步骤 1 已经设置了标题
        }
    };

    // 保存消息到后端
    const persistMessages = useCallback(async (convId: string, userInput: string, agentResponse: string) => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
            };
            // 保存用户消息
            await fetch(`/api/v1/chat/conversations/${encodeURIComponent(convId)}/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    id: `msg-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    role: 'user',
                    content: userInput,
                }),
            });
            // 保存 Agent 回复
            await fetch(`/api/v1/chat/conversations/${encodeURIComponent(convId)}/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    id: `msg-agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    role: 'assistant',
                    content: agentResponse,
                }),
            });
        } catch (error) {
            console.error('保存消息到后端失败:', error);
        }
    }, []);

    // 处理用户输入
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isProcessing) return;

        const userInput = inputValue.trim();
        setInputValue('');

        // 如果没有当前对话,先创建一个
        let isNewConversation = false;
        let convId = currentConversationId;
        if (!convId) {
            try {
                const newConv = await bioextractAPI.createConversation();
                convId = newConv.id;
                setCurrentConversationId(convId);
                setConversations([newConv, ...conversations]);
                isNewConversation = true;
            } catch (error) {
                console.error('创建对话失败:', error);
            }
        }

        addUserMessage(userInput);
        await sendToAgent(userInput);

        // 获取 agent 最新回复并持久化到后端
        if (convId) {
            const latestSession = useBioExtractStore.getState().session;
            const agentMsgs = latestSession?.messages.filter(m => m.role === 'agent') || [];
            const lastAgent = agentMsgs[agentMsgs.length - 1];
            if (lastAgent) {
                await persistMessages(convId, userInput, lastAgent.content);
            }
        }

        // 首轮对话完成后自动生成标题
        if (isNewConversation && convId) {
            generateAndUpdateTitle(convId, userInput);
        } else {
            // 发送消息后重新加载对话列表(更新时间)
            setTimeout(() => loadConversations(), 1000);
        }
    };

    // 处理快捷命令
    const handleQuickCommand = async (prompt: string) => {
        if (isProcessing) return;

        // 如果没有当前对话,先创建一个
        let isNewConversation = false;
        let convId = currentConversationId;
        if (!convId) {
            try {
                const newConv = await bioextractAPI.createConversation();
                convId = newConv.id;
                setCurrentConversationId(convId);
                setConversations([newConv, ...conversations]);
                isNewConversation = true;
            } catch (error) {
                console.error('创建对话失败:', error);
            }
        }

        addUserMessage(prompt);
        await sendToAgent(prompt);

        // 持久化到后端
        if (convId) {
            const latestSession = useBioExtractStore.getState().session;
            const agentMsgs = latestSession?.messages.filter(m => m.role === 'agent') || [];
            const lastAgent = agentMsgs[agentMsgs.length - 1];
            if (lastAgent) {
                await persistMessages(convId, prompt, lastAgent.content);
            }
        }

        // 首轮对话完成后自动生成标题
        if (isNewConversation && convId) {
            generateAndUpdateTitle(convId, prompt);
        } else {
            setTimeout(() => loadConversations(), 1000);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* Conversations Sidebar */}
            <aside className={`border-r border-gray-200 bg-white flex flex-col transition-all duration-300 ease-in-out ${showConversations ? 'w-64' : 'w-0'
                }`}>
                {showConversations && (
                    <>
                        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
                            <span className="font-bold text-sm text-gray-700 flex items-center gap-2">
                                <MessageSquare size={16} /> 对话历史
                            </span>
                            <button
                                onClick={handleNewConversation}
                                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600"
                                title="新建对话"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => handleSelectConversation(conv.id)}
                                    className={`w-full text-left p-3 mb-2 rounded-lg transition-colors ${currentConversationId === conv.id
                                        ? 'bg-purple-50 border border-purple-200'
                                        : 'hover:bg-gray-50 border border-transparent'
                                        }`}
                                >
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                        {conv.title || '新对话'}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {formatDate(conv.updated_at)}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowConversations(!showConversations)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        >
                            <MessageSquare size={18} />
                        </button>
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl shadow-sm">
                            🧬
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">BioExtract-AI</h1>
                            <p className="text-xs text-gray-500">生物材料智能筛选助手</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                            <div className={`flex items-center gap-1.5 ${backendConnected ? 'text-green-600' : 'text-red-400'}`}>
                                <Database size={14} />
                                <span>Core: {(backendStats?.delivery_systems_count || 0) + (backendStats?.micro_features_count || 0)}</span>
                            </div>
                            <div className="w-px h-3 bg-gray-300 mx-1"></div>
                            <div className={`flex items-center gap-1.5 ${knowledgeStats ? 'text-blue-600' : 'text-gray-400'}`}>
                                <Dna size={14} />
                                <span>KB: {(knowledgeStats?.totalDocuments || 0).toLocaleString()}</span>
                            </div>
                            <div className="w-px h-3 bg-gray-300 mx-1"></div>
                            <div className={`flex items-center gap-1.5 ${llmConfigured ? 'text-green-600' : 'text-amber-500'}`}>
                                <Server size={14} />
                                <span>LLM: {llmConfigured ? 'Ready' : 'Not Configured'}</span>
                            </div>
                        </div>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate('/settings')}
                            leftIcon={<Settings size={14} />}
                        >
                            模型配置
                        </Button>
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
                    {(session?.messages || []).map((message) => (
                        <React.Fragment key={message.id}>
                            <div className={`flex gap-4 max-w-4xl mx-auto ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${message.role === 'agent' ? 'bg-purple-100 text-purple-600' :
                                    message.role === 'system' ? 'bg-gray-100 text-gray-600' :
                                        'bg-gray-900 text-white'
                                    }`}>
                                    {message.role === 'agent' ? '🤖' : message.role === 'system' ? '⚙️' : '👤'}
                                </div>

                                <div className={`flex-1 min-w-0 max-w-[85%] space-y-1 ${message.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                                    {/* 每条 agent 消息的独立思考过程（嵌入在回答内容上方） */}
                                    {message.role === 'agent' && message.thinkingSteps && message.thinkingSteps.length > 0 && (
                                        <MessageThinking steps={message.thinkingSteps} />
                                    )}
                                    <div className={`prose prose-sm max-w-none rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${message.role === 'user'
                                        ? 'bg-gray-900 text-white rounded-tr-none'
                                        : 'bg-white border border-gray-100 rounded-tl-none text-gray-800'
                                        }`}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                // Override pre/code to look nice
                                                // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
                                                code({ node: _node, inline, className, children, ...props }: any) {
                                                    const match = /language-(\w+)/.exec(className || '')
                                                    return !inline && match ? (
                                                        <div className="relative group">
                                                            <div className="absolute right-2 top-2 text-xs text-gray-400 select-none group-hover:block hidden">{match[1]}</div>
                                                            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto my-2 font-mono" {...props}>
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            </pre>
                                                        </div>
                                                    ) : (
                                                        <code className={`${className} bg-gray-100 text-purple-700 px-1 py-0.5 rounded text-xs font-mono`} {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                },
                                                table({ children }) {
                                                    return <div className="overflow-x-auto my-2"><table className="min-w-full text-xs text-left text-gray-600 border border-gray-200 rounded-lg overflow-hidden">{children}</table></div>
                                                },
                                                thead({ children }) {
                                                    return <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">{children}</thead>
                                                },
                                                th({ children }) {
                                                    return <th className="px-3 py-2">{children}</th>
                                                },
                                                td({ children }) {
                                                    return <td className="px-3 py-2 border-t border-gray-100">{children}</td>
                                                }
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>

                                    <span className="text-[10px] text-gray-400 px-1">
                                        {formatTime(message.timestamp)}
                                    </span>
                                </div>
                            </div>
                        </React.Fragment>
                    ))}

                    {/* 正在思考中：跟随 agent 头像展示 */}
                    {isThinking && thinkingSteps.length > 0 && (
                        <div className="flex gap-4 max-w-4xl mx-auto">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 animate-pulse">
                                🤖
                            </div>
                            <div className="flex-1 min-w-0 max-w-[85%] space-y-1">
                                <ThinkingProcess
                                    steps={thinkingSteps}
                                    isThinking={true}
                                    collapsed={false}
                                    onToggle={toggleThinking}
                                />
                            </div>
                        </div>
                    )}

                    {isProcessing && !isThinking && (
                        <div className="flex gap-4 max-w-4xl mx-auto">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 animate-pulse">
                                🤖
                            </div>
                            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
                                <div className="flex gap-1 h-5 items-center px-1">
                                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100 z-20">
                    <div className="max-w-4xl mx-auto w-full space-y-4">
                        {/* Quick Commands */}
                        {(session?.messages || []).filter(m => m.role !== 'system').length === 0 && !isProcessing && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                {QUICK_COMMANDS.map((cmd, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleQuickCommand(cmd.prompt)}
                                        className="flex flex-col items-start p-3 bg-gray-50 hover:bg-purple-50 hover:border-purple-200 border border-gray-100 rounded-xl transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-2 mb-1 text-gray-700 font-semibold text-xs group-hover:text-purple-700">
                                            {cmd.icon}
                                            {cmd.label}
                                        </div>
                                        <div className="text-[10px] text-gray-500 line-clamp-2">{cmd.description}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="relative flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-400 transition-shadow shadow-sm">
                            <input
                                type="text"
                                className="flex-1 bg-transparent border-0 focus:ring-0 px-3 py-2 text-gray-800 placeholder-gray-400 text-sm"
                                placeholder={llmConfigured ? "向 BioExtract 提问..." : "请先配置 LLM 模型..."}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={isProcessing}
                            />
                            <Button
                                type="submit"
                                disabled={isProcessing || !inputValue.trim()}
                                isLoading={isProcessing}
                                size="sm"
                                className="rounded-xl px-4"
                            >
                                <Send size={16} />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Logs Sidebar */}
            <aside className={`border-l border-gray-200 bg-gray-50 flex flex-col transition-all duration-300 ease-in-out ${showProcessLog ? 'w-80' : 'w-12 hover:w-16'
                }`}>
                <div className="h-16 border-b border-gray-200 flex items-center justify-center px-3 bg-gray-100 relative">
                    {showProcessLog && (
                        <span className="font-bold text-xs uppercase text-gray-500 flex items-center gap-2 absolute left-4">
                            <Terminal size={14} /> Process Log
                        </span>
                    )}
                    <button onClick={toggleProcessLog} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 absolute right-3">
                        {showProcessLog ? <ChevronRight size={16} /> : <Terminal size={16} />}
                    </button>
                </div>

                {showProcessLog && (
                    <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px]">
                        {processLog.map((entry, i) => (
                            <div key={i} className={`mb-2 p-2 rounded border break-words whitespace-pre-wrap ${entry.type === 'warning' ? 'bg-red-50 border-red-100 text-red-600' :
                                entry.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                                    'bg-white border-gray-200 text-gray-600'
                                }`}>
                                <div className="opacity-50 text-[9px] mb-1 uppercase tracking-wider">{entry.type}</div>
                                {entry.content}
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                )}
            </aside>
        </div>
    );
};

// Helpers
function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return '今天 ' + formatTime(date);
    } else if (days === 1) {
        return '昨天';
    } else if (days < 7) {
        return `${days} 天前`;
    } else {
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
}

export default BioExtractChat;
