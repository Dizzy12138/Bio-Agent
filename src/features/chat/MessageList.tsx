import React, { useRef, useEffect } from 'react';
import { User, Bot, Database, FileText, Sparkles, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../../stores';
import { GenerativeUIRenderer } from './GenerativeUIRenderer';
import type { Message, ToolCall, Citation } from '../../types';

export const MessageList: React.FC = () => {
    const { messages, isStreaming } = useChatStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/50">
                <div className="max-w-2xl w-full text-center space-y-8">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
                            <Bot size={40} className="text-blue-600" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-gray-900">欢迎使用慢性创面愈合 Agent</h3>
                        <p className="text-gray-500">基于多模态数据和专家知识库的智能助手</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        {[
                            { icon: <Database className="text-purple-500" />, title: "生物材料查询", desc: "查询适合特定创面类型的生物材料" },
                            { icon: <Sparkles className="text-yellow-500" />, title: "性质对比", desc: "比较不同水凝胶敷料的理化性质" },
                            { icon: <FileText className="text-green-500" />, title: "文献检索", desc: "检索相关文献并生成实验方案" },
                            { icon: <MessageSquare className="text-pink-500" />, title: "治疗推荐", desc: "针对感染创面推荐抗菌材料组合" }
                        ].map((item, idx) => (
                            <div key={idx} className="p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-gray-50 rounded-lg">{item.icon}</div>
                                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8">
                        <p className="text-sm text-gray-400 mb-4">试着问我：</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {[
                                "针对高渗出性糖尿病足溃疡推荐材料",
                                "壳聚糖和海藻酸盐的性能对比"
                            ].map((query, idx) => (
                                <button
                                    key={idx}
                                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                                >
                                    {query}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
            ))}

            {isStreaming && (
                <div className="flex gap-4 max-w-4xl">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot size={16} className="text-blue-600" />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
                        <div className="flex gap-1 h-6 items-center px-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
        </div>
    );
};

// 单条消息组件
const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`flex gap-4 max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-gray-900 text-white' : 'bg-blue-100 text-blue-600'
                }`}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
            </div>

            <div className={`flex-1 min-w-0 max-w-[85%] space-y-2 ${isUser ? 'items-end flex flex-col' : ''}`}>
                <div className={`rounded-2xl p-4 shadow-sm text-sm leading-relaxed overflow-hidden ${isUser
                        ? 'bg-gray-900 text-white rounded-tr-none'
                        : 'bg-white border border-gray-100 rounded-tl-none text-gray-800'
                    }`}>

                    {/* 工具调用显示 */}
                    {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
                        <div className="mb-4 space-y-2">
                            {message.metadata.toolCalls.map((tool) => (
                                <ToolCallCard key={tool.id} toolCall={tool} />
                            ))}
                        </div>
                    )}

                    {/* 消息正文 */}
                    <div className={`markdown-body ${isUser ? 'text-white' : 'prose prose-sm max-w-none text-gray-800'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                    </div>

                    {/* 生成式UI */}
                    {message.metadata?.generativeUI && (
                        <div className="mt-4">
                            <GenerativeUIRenderer payload={message.metadata.generativeUI} />
                        </div>
                    )}

                    {/* 引用来源 */}
                    {message.metadata?.citations && message.metadata.citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-200/50">
                            <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
                                <FileText size={12} /> 参考文献
                            </h4>
                            <div className="space-y-2">
                                {message.metadata.citations.map((citation) => (
                                    <CitationCard key={citation.id} citation={citation} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <span className="text-[10px] text-gray-400 px-1">
                    {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>
            </div>
        </div>
    );
};

// 工具调用卡片
const ToolCallCard: React.FC<{ toolCall: ToolCall }> = ({ toolCall }) => {
    return (
        <div className={`text-xs border rounded-lg overflow-hidden ${toolCall.status === 'success' ? 'bg-green-50/50 border-green-100' :
                toolCall.status === 'error' ? 'bg-red-50/50 border-red-100' :
                    'bg-gray-50 border-gray-200'
            }`}>
            <div className={`flex items-center justify-between px-3 py-2 border-b ${toolCall.status === 'success' ? 'border-green-100/50' : 'border-gray-200/50'
                }`}>
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <Database size={12} />
                    <span>{toolCall.name}</span>
                </div>
                <span className={`flex items-center gap-1 ${toolCall.status === 'success' ? 'text-green-600' :
                        toolCall.status === 'error' ? 'text-red-500' :
                            'text-gray-500'
                    }`}>
                    {toolCall.status === 'success' && '✓ 成功'}
                    {toolCall.status === 'running' && '⏳ 执行中'}
                    {toolCall.status === 'error' && '✗ 失败'}
                </span>
            </div>
            {toolCall.result && (
                <div className="p-2 bg-white/50 overflow-x-auto">
                    <pre className="font-mono text-[10px] text-gray-600">
                        {typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

// 引用卡片
const CitationCard: React.FC<{ citation: Citation }> = ({ citation }) => {
    return (
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors cursor-pointer group">
            <div className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 transition-colors line-clamp-1">
                {citation.title}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                <span className="truncate max-w-[120px]">{citation.authors?.join(', ')}</span>
                <span>•</span>
                <span className="font-medium text-gray-600">{citation.source}</span>
            </div>
            {citation.snippet && (
                <div className="mt-1.5 text-[10px] text-gray-500 leading-relaxed border-l-2 border-gray-300 pl-2 italic line-clamp-2">
                    "{citation.snippet}"
                </div>
            )}
        </div>
    );
};
