import React, { useState, useRef, useEffect } from 'react';
import type { Expert, ConversationMessage } from '../types';
import { EXPERT_DOMAINS, EXPERT_CAPABILITIES } from '../types';

interface ExpertCreationProps {
    onComplete: (expert: Expert) => void;
    onCancel: () => void;
}

interface CreationState {
    step: number;
    name: string;
    avatar: string;
    domain: string;
    capabilities: string[];
    description: string;
    systemPrompt: string;
}

const CREATION_STEPS = [
    { id: 'intro', question: '你好！我是专家创建助手。让我们一起创建一位专业的领域专家吧！首先，给你的专家起个名字吧？' },
    { id: 'domain', question: '很好！{name} 是一个不错的名字。请选择或输入这位专家的专业领域：' },
    { id: 'capabilities', question: '了解了！{name} 将专注于{domain}领域。请选择这位专家应该具备的能力（可多选）：' },
    { id: 'description', question: '太棒了！现在请用一两句话描述 {name} 的主要职责和特长：' },
    { id: 'prompt', question: '最后一步！请提供专家的核心提示词，描述他/她应该如何回答问题、有什么专业背景、需要遵循什么原则：' },
    { id: 'preview', question: '完成！以下是 {name} 的配置预览。确认无误后点击"创建专家"即可：' },
];

const AVATAR_OPTIONS = ['🧑‍⚕️', '👨‍🔬', '👩‍🔬', '🧑‍🏫', '👨‍💼', '👩‍💼', '🤖', '🧬', '💊', '🔬', '📊', '📚'];

export const ExpertCreation: React.FC<ExpertCreationProps> = ({ onComplete, onCancel }) => {
    const [state, setState] = useState<CreationState>({
        step: 0,
        name: '',
        avatar: '🧑‍⚕️',
        domain: '',
        capabilities: [],
        description: '',
        systemPrompt: '',
    });
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

    // 初始化消息 - 使用 ref 防止 StrictMode 下重复执行
    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            addAssistantMessage(CREATION_STEPS[0].question);
        }
    }, []);

    // 滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const addAssistantMessage = (content: string) => {
        setIsTyping(true);
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: formatMessage(content),
                timestamp: new Date().toISOString(),
            }]);
            setIsTyping(false);
        }, 500);
    };

    const addUserMessage = (content: string) => {
        setMessages(prev => [...prev, {
            id: `msg-${Date.now()}`,
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
        }]);
    };

    const formatMessage = (template: string) => {
        return template
            .replace('{name}', state.name || '专家')
            .replace('{domain}', state.domain || '领域');
    };

    const handleSend = () => {
        if (!inputValue.trim() && state.step !== 2) return;

        const value = inputValue.trim();
        addUserMessage(value || (state.step === 2 ? state.capabilities.join('、') : ''));
        setInputValue('');

        // 处理当前步骤
        processStep(value);
    };

    const processStep = (value: string) => {
        const currentStep = state.step;

        switch (currentStep) {
            case 0: // 名字
                setState(prev => ({ ...prev, name: value, step: 1 }));
                setTimeout(() => addAssistantMessage(CREATION_STEPS[1].question.replace('{name}', value)), 300);
                break;
            case 1: // 领域
                setState(prev => ({ ...prev, domain: value, step: 2 }));
                setTimeout(() => addAssistantMessage(CREATION_STEPS[2].question.replace('{name}', state.name).replace('{domain}', value)), 300);
                break;
            case 2: // 能力
                setState(prev => ({ ...prev, step: 3 }));
                setTimeout(() => addAssistantMessage(CREATION_STEPS[3].question), 300);
                break;
            case 3: // 描述
                setState(prev => ({ ...prev, description: value, step: 4 }));
                setTimeout(() => addAssistantMessage(CREATION_STEPS[4].question), 300);
                break;
            case 4: // 提示词
                setState(prev => ({ ...prev, systemPrompt: value, step: 5 }));
                setTimeout(() => addAssistantMessage(CREATION_STEPS[5].question.replace('{name}', state.name)), 300);
                break;
        }
    };

    const handleDomainSelect = (domain: string) => {
        setInputValue(domain);
    };

    const handleCapabilityToggle = (capability: string) => {
        setState(prev => ({
            ...prev,
            capabilities: prev.capabilities.includes(capability)
                ? prev.capabilities.filter(c => c !== capability)
                : [...prev.capabilities, capability]
        }));
    };

    const handleAvatarSelect = (avatar: string) => {
        setState(prev => ({ ...prev, avatar }));
    };

    const handleCreate = () => {
        const newExpert: Expert = {
            id: `expert-${Date.now()}`,
            name: state.name,
            avatar: state.avatar,
            description: state.description,
            domain: state.domain,
            capabilities: state.capabilities,
            systemPrompt: state.systemPrompt,
            tools: ['knowledge-search'],
            knowledgeBases: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'user',
            usageCount: 0,
            isSystem: false,
            status: 'active',
        };
        onComplete(newExpert);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="expert-creation">
            {/* Header */}
            <div className="expert-creation-header">
                <h2 className="expert-creation-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" />
                        <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                    创建专家助手
                </h2>
                <div className="creation-progress">
                    {CREATION_STEPS.map((_, index) => (
                        <div
                            key={index}
                            className={`creation-step ${index === state.step ? 'active' : ''} ${index < state.step ? 'completed' : ''}`}
                        />
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div className="expert-creation-messages">
                {messages.map(message => (
                    <div key={message.id} className={`creation-message ${message.role}`}>
                        <div className={`message-avatar ${message.role}`}>
                            {message.role === 'assistant' ? '🤖' : '👤'}
                        </div>
                        <div className="message-content">
                            {message.content}

                            {/* Domain selection options */}
                            {state.step === 1 && message.role === 'assistant' && messages.indexOf(message) === messages.length - 1 && (
                                <div className="quick-options">
                                    {EXPERT_DOMAINS.map(domain => (
                                        <button
                                            key={domain.id}
                                            className={`quick-option ${inputValue === domain.name ? 'selected' : ''}`}
                                            onClick={() => handleDomainSelect(domain.name)}
                                        >
                                            {domain.icon} {domain.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Capability selection */}
                            {state.step === 2 && message.role === 'assistant' && messages.indexOf(message) === messages.length - 1 && (
                                <div className="quick-options">
                                    {EXPERT_CAPABILITIES.map(cap => (
                                        <button
                                            key={cap}
                                            className={`quick-option ${state.capabilities.includes(cap) ? 'selected' : ''}`}
                                            onClick={() => handleCapabilityToggle(cap)}
                                        >
                                            {cap}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                    <div className="creation-message assistant">
                        <div className="message-avatar assistant">🤖</div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview */}
                {state.step === 5 && (
                    <div className="creation-message assistant">
                        <div className="message-avatar assistant">🤖</div>
                        <div className="message-content">
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <strong>专家预览</strong>
                            </div>

                            {/* Avatar Selection */}
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                                    选择头像：
                                </div>
                                <div className="quick-options">
                                    {AVATAR_OPTIONS.map(avatar => (
                                        <button
                                            key={avatar}
                                            className={`quick-option ${state.avatar === avatar ? 'selected' : ''}`}
                                            onClick={() => handleAvatarSelect(avatar)}
                                            style={{ fontSize: '20px', padding: 'var(--space-2)' }}
                                        >
                                            {avatar}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{
                                padding: 'var(--space-4)',
                                background: 'var(--bg-primary)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                    <span style={{ fontSize: '32px' }}>{state.avatar}</span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{state.name}</div>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{state.domain}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                                    {state.description}
                                </div>
                                <div className="quick-options" style={{ marginBottom: 'var(--space-3)' }}>
                                    {state.capabilities.map(cap => (
                                        <span key={cap} className="capability-tag">{cap}</span>
                                    ))}
                                </div>
                                <div style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--text-muted)',
                                    background: 'var(--bg-tertiary)',
                                    padding: 'var(--space-2)',
                                    borderRadius: 'var(--radius-md)',
                                    fontFamily: 'var(--font-mono)',
                                    maxHeight: '80px',
                                    overflow: 'auto'
                                }}>
                                    {state.systemPrompt.substring(0, 200)}...
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                                <button className="btn btn-outline" onClick={onCancel}>
                                    取消
                                </button>
                                <button className="btn btn-primary" onClick={handleCreate}>
                                    创建专家
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {state.step < 5 && (
                <div className="expert-creation-input">
                    <div className="creation-input-wrapper">
                        <textarea
                            className="creation-textarea"
                            placeholder={state.step === 2 ? "选择能力后点击发送，或输入自定义能力..." : "输入消息..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                        />
                        <button
                            className="creation-send-btn"
                            onClick={handleSend}
                            disabled={!inputValue.trim() && state.step !== 2}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22,2 15,22 11,13 2,9 22,2" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
