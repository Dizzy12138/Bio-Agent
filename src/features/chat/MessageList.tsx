import React, { useRef, useEffect } from 'react';
import { User, Bot, Database, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../../stores';
import { GenerativeUIRenderer } from './GenerativeUIRenderer';
import type { Message, ToolCall, Citation } from '../../types';
import './MessageList.css';

export const MessageList: React.FC = () => {
    const { messages, isStreaming } = useChatStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="message-list empty">
                <div className="welcome-message">
                    <div className="welcome-icon">
                        <Bot size={48} />
                    </div>
                    <h3>欢迎使用慢性创面愈合 Agent</h3>
                    <p>我可以帮助您：</p>
                    <ul>
                        <li>🔬 查询适合特定创面类型的生物材料</li>
                        <li>📊 比较不同水凝胶敷料的理化性质</li>
                        <li>📚 检索相关文献并生成实验方案</li>
                        <li>💊 针对感染创面推荐抗菌材料组合</li>
                    </ul>
                    <div className="example-queries">
                        <p>试试问我：</p>
                        <button className="example-btn">
                            针对高渗出性糖尿病足溃疡推荐材料
                        </button>
                        <button className="example-btn">
                            壳聚糖和海藻酸盐的性能对比
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="message-list">
            {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
            ))}

            {isStreaming && (
                <div className="message assistant">
                    <div className="message-avatar">
                        <Bot size={20} />
                    </div>
                    <div className="message-content">
                        <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
};

// 单条消息组件
const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`message ${message.role}`}>
            <div className="message-avatar">
                {isUser ? <User size={20} /> : <Bot size={20} />}
            </div>

            <div className="message-content">
                {/* 工具调用显示 */}
                {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
                    <div className="tool-calls">
                        {message.metadata.toolCalls.map((tool) => (
                            <ToolCallCard key={tool.id} toolCall={tool} />
                        ))}
                    </div>
                )}

                {/* 消息正文 */}
                <div className="message-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                    </ReactMarkdown>
                </div>

                {/* 生成式UI */}
                {message.metadata?.generativeUI && (
                    <GenerativeUIRenderer payload={message.metadata.generativeUI} />
                )}

                {/* 引用来源 */}
                {message.metadata?.citations && message.metadata.citations.length > 0 && (
                    <div className="citations">
                        <h4>
                            <FileText size={14} /> 参考文献
                        </h4>
                        {message.metadata.citations.map((citation) => (
                            <CitationCard key={citation.id} citation={citation} />
                        ))}
                    </div>
                )}

                <span className="message-time">
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
        <div className={`tool-call-card ${toolCall.status}`}>
            <div className="tool-call-header">
                <Database size={14} />
                <span className="tool-name">{toolCall.name}</span>
                <span className={`tool-status ${toolCall.status}`}>
                    {toolCall.status === 'success' && '✓ 成功'}
                    {toolCall.status === 'running' && '⏳ 执行中'}
                    {toolCall.status === 'error' && '✗ 失败'}
                </span>
            </div>
            {toolCall.result && (
                <div className="tool-call-result">
                    <code>{JSON.stringify(toolCall.result, null, 2)}</code>
                </div>
            )}
        </div>
    );
};

// 引用卡片
const CitationCard: React.FC<{ citation: Citation }> = ({ citation }) => {
    return (
        <div className="citation-card">
            <div className="citation-title">{citation.title}</div>
            <div className="citation-meta">
                {citation.authors?.join(', ')} · {citation.source}
            </div>
            {citation.snippet && (
                <div className="citation-snippet">"{citation.snippet}"</div>
            )}
        </div>
    );
};
