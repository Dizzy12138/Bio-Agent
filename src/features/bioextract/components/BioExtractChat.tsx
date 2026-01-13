/**
 * BioExtract-AI 对话界面组件
 * 支持 Agent 思考过程展示和 LLM 调用
 */

import React, { useState, useRef, useEffect } from 'react';
import { useBioExtractStore } from '../stores/bioextractStore';
import { LLMConfigModal } from './LLMConfigModal';
import { ThinkingProcess } from './ThinkingProcess';
import './BioExtractChat.css';

// 预设的快捷命令 - 基于 drug_delivery.csv 数据
const QUICK_COMMANDS = [
    // 查询类
    {
        label: '🔍 查找 pH 响应载体',
        prompt: '请从 drug_delivery.csv 数据库中查找具有 pH 响应机制的载体设计。列出相关的聚合物名称、载体形态和释放动力学特征。',
    },
    {
        label: '🧬 PEG 相关方案',
        prompt: '查找数据库中所有使用 PEG（聚乙二醇）或其衍生物的药物递送方案。分析其载体形态、响应机制和释放特性。',
    },
    {
        label: '🦠 益生菌递送方案',
        prompt: '查找数据库中适用于益生菌或微生物递送的方案。关注微生物指标（包埋效率、保护性能、释放后活性）和载体设计。',
    },
    // 推荐类
    {
        label: '💊 水凝胶载体推荐',
        prompt: '基于数据库中的水凝胶（Hydrogel）载体案例，为口服药物递送推荐合适的水凝胶设计方案。考虑 pH 响应性和胃肠道保护。',
    },
    {
        label: '🎯 靶向递送设计',
        prompt: '推荐具有靶向递送能力的聚合物载体设计。分析数据库中的响应机制（如酶响应、pH 响应、温度响应），选择最适合结肠靶向的方案。',
    },
];

export const BioExtractChat: React.FC = () => {
    const {
        session,
        isProcessing,
        databaseStatus,
        llmConfigured,
        processLog,
        showProcessLog,
        thinkingSteps,
        isThinking,
        showThinking,
        initSession,
        addUserMessage,
        sendToAgent,
        setLLMConfig,
        toggleProcessLog,
        toggleThinking,
    } = useBioExtractStore();

    const [inputValue, setInputValue] = useState('');
    const [showConfigModal, setShowConfigModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [processLog]);

    // 初始化会话
    useEffect(() => {
        if (!session) {
            initSession();
        }
    }, [session, initSession]);

    // 处理用户输入 - 调用 Agent
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isProcessing) return;

        const userInput = inputValue.trim();
        setInputValue('');
        addUserMessage(userInput);

        // 调用 Agent（包含思考过程）
        await sendToAgent(userInput);
    };

    // 处理快捷命令
    const handleQuickCommand = async (prompt: string) => {
        if (isProcessing) return;
        addUserMessage(prompt);
        await sendToAgent(prompt);
    };

    return (
        <div className="bioextract-container">
            {/* 主对话区域 */}
            <div className="bioextract-main">
                {/* 头部 */}
                <header className="bioextract-header">
                    <div className="header-title">
                        <div className="header-icon">🧬</div>
                        <div className="header-text">
                            <h1>BioExtract-AI</h1>
                            <span className="header-subtitle">生物材料智能筛选助手</span>
                        </div>
                    </div>
                    <div className="header-actions">
                        <div className="header-status">
                            <div className={`status-indicator ${databaseStatus?.initialized ? 'connected' : ''}`}>
                                <span className="status-dot" />
                                SQLite: {(databaseStatus?.totalRows || 0).toLocaleString()} 条
                            </div>
                            <div className={`status-indicator ${llmConfigured ? 'connected' : 'warning'}`}>
                                <span className="status-dot" />
                                LLM: {llmConfigured ? '已连接' : '未配置'}
                            </div>
                        </div>
                        <button
                            className="config-btn"
                            onClick={() => setShowConfigModal(true)}
                            title="配置 LLM 模型"
                        >
                            ⚙️
                        </button>
                    </div>
                </header>

                {/* 消息列表 */}
                <div className="bioextract-messages">
                    {session?.messages.map(message => (
                        <div
                            key={message.id}
                            className={`message message-${message.role}`}
                        >
                            {message.role === 'agent' && (
                                <div className="message-avatar">🤖</div>
                            )}
                            {message.role === 'user' && (
                                <div className="message-avatar">👤</div>
                            )}
                            {message.role === 'system' && (
                                <div className="message-avatar">⚙️</div>
                            )}
                            <div className="message-content">
                                <div
                                    className="message-text"
                                    dangerouslySetInnerHTML={{
                                        __html: formatMarkdown(message.content)
                                    }}
                                />
                                <span className="message-time">
                                    {formatTime(message.timestamp)}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* 思考过程展示 */}
                    {(isThinking || thinkingSteps.length > 0) && (
                        <ThinkingProcess
                            steps={thinkingSteps}
                            isThinking={isThinking}
                            collapsed={!showThinking}
                            onToggle={toggleThinking}
                        />
                    )}

                    {isProcessing && !isThinking && (
                        <div className="message message-agent">
                            <div className="message-avatar">🤖</div>
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

                {/* 快捷命令 */}
                <div className="quick-commands">
                    {QUICK_COMMANDS.map((cmd, i) => (
                        <button
                            key={i}
                            className="quick-command-btn"
                            onClick={() => handleQuickCommand(cmd.prompt)}
                            disabled={isProcessing}
                        >
                            {cmd.label}
                        </button>
                    ))}
                </div>

                {/* 输入区域 */}
                <form className="bioextract-input" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={llmConfigured ? "输入您的问题..." : "请先配置 LLM API Key..."}
                        disabled={isProcessing}
                    />
                    <button type="submit" disabled={isProcessing || !inputValue.trim()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22,2 15,22 11,13 2,9" />
                        </svg>
                    </button>
                </form>
            </div>

            {/* 处理日志面板 */}
            <aside className={`process-log-panel ${showProcessLog ? 'open' : ''}`}>
                <div className="log-header">
                    <h3>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                            <polyline points="4,17 10,11 4,5" />
                            <line x1="12" y1="19" x2="20" y2="19" />
                        </svg>
                        Process Log
                    </h3>
                    <button className="log-toggle" onClick={toggleProcessLog}>
                        {showProcessLog ? '收起' : '展开'}
                    </button>
                </div>

                <div className="log-content">
                    <pre>
                        <code>
                            {processLog.map((entry, i) => (
                                <div key={i} className={`log-entry log-${entry.type}`}>
                                    {entry.content}
                                </div>
                            ))}
                        </code>
                    </pre>
                    <div ref={logEndRef} />
                </div>
            </aside>

            {/* LLM 配置弹窗 */}
            <LLMConfigModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
                onSave={(config) => setLLMConfig(config)}
            />
        </div>
    );
};

// ========== 辅助函数 ==========

function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * HTML 消毒函数，防止 XSS 攻击
 * 移除危险的标签和属性
 */
function sanitizeHTML(html: string): string {
    // 移除 script 标签
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // 移除 on* 事件属性
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    // 移除 javascript: 协议
    sanitized = sanitized.replace(/javascript:/gi, '');
    // 移除 iframe, object, embed 标签
    sanitized = sanitized.replace(/<(iframe|object|embed|form)[^>]*>.*?<\/\1>/gi, '');
    sanitized = sanitized.replace(/<(iframe|object|embed|form)[^>]*\/>/gi, '');
    return sanitized;
}

function formatMarkdown(text: string): string {
    // 先处理表格（在其他转换之前）
    let processedText = text;

    // 检测并转换 Markdown 表格
    const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
    processedText = processedText.replace(tableRegex, (_, headerRow, bodyRows) => {
        // 解析表头
        const headers = headerRow.split('|').map((h: string) => h.trim()).filter((h: string) => h);

        // 解析表体
        const rows = bodyRows.trim().split('\n').map((row: string) =>
            row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell)
        );

        // 构建 HTML 表格
        let tableHtml = '<div class="table-wrapper"><table>';
        tableHtml += '<thead><tr>';
        headers.forEach((header: string) => {
            tableHtml += `<th>${header}</th>`;
        });
        tableHtml += '</tr></thead>';
        tableHtml += '<tbody>';
        rows.forEach((row: string[]) => {
            tableHtml += '<tr>';
            row.forEach((cell: string) => {
                // 处理单元格内的粗体
                const formattedCell = cell.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                tableHtml += `<td>${formattedCell}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table></div>';

        return tableHtml;
    });

    // Markdown 转换
    const html = processedText
        // 代码块
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
        // 标题
        .replace(/^### (.+)$/gm, '<h4 class="md-h3">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 class="md-h2">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 class="md-h1">$1</h2>')
        // 粗体
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // 斜体
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // 链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        // 行内代码
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // 引用块
        .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
        // 分隔线
        .replace(/^---$/gm, '<hr />')
        // 无序列表 - 更好的处理
        .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
        // 有序列表
        .replace(/^(\d+)\. (.+)$/gm, '<li><span class="list-num">$1.</span> $2</li>')
        // 将连续的 li 包装在 ul/ol 中
        .replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>')
        // 清理多余的换行
        .replace(/\n{3,}/g, '\n\n')
        // 段落
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br />');

    // XSS 防护：消毒处理
    return sanitizeHTML(html);
}

export default BioExtractChat;
