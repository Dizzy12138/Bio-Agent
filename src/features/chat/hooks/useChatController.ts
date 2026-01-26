import { useState } from 'react';
import { useChatStore } from '../../../stores';
import { AVAILABLE_EXPERTS, type Expert } from '../../../constants/experts';
import type { Conversation, Message } from '../../../types';
import { mockChatAPI } from '../../../services/mock/chatMockService';
import { sendMessage } from '../api/chatAPI';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'; // 默认开启 Mock

export const useChatController = () => {
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportConversation, setExportConversation] = useState<Conversation | null>(null);

    const {
        addMessage,
        isStreaming,
        setStreaming,
        currentConversation,
        setCurrentConversation,
        createNewConversation,
        setCurrentExpert,
    } = useChatStore();

    // 处理选择对话
    const handleSelectConversation = (conversation: Conversation) => {
        setCurrentConversation(conversation);
        if (conversation.expertId) {
            const expert = AVAILABLE_EXPERTS.find(e => e.id === conversation.expertId);
            if (expert) setSelectedExpert(expert);
        } else {
            setSelectedExpert(null);
        }
        setShowHistory(false);
    };

    // 新建对话
    const handleNewConversation = () => {
        createNewConversation(
            selectedExpert?.id,
            selectedExpert?.name,
            selectedExpert?.avatar
        );
        setShowHistory(false);
    };

    // 导出对话
    const handleExportConversation = (conversation: Conversation) => {
        setExportConversation(conversation);
        setShowExportModal(true);
        setShowHistory(false);
    };

    // 检测 @ 符号
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInputValue(value);

        // 检测是否输入了 @
        const lastAtIndex = value.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const textAfterAt = value.substring(lastAtIndex + 1);
            // 如果 @ 后面没有空格，显示提及列表
            if (!textAfterAt.includes(' ')) {
                setShowMentionList(true);
                setMentionFilter(textAfterAt.toLowerCase());
            } else {
                setShowMentionList(false);
            }
        } else {
            setShowMentionList(false);
        }
    };

    // 选择提及的专家
    const handleMentionSelect = (expert: Expert) => {
        const lastAtIndex = inputValue.lastIndexOf('@');
        const newValue = inputValue.substring(0, lastAtIndex) + `@${expert.name} `;
        setInputValue(newValue);
        setSelectedExpert(expert);
        setShowMentionList(false);
    };

    // 选择专家
    const handleExpertSelect = (expert: Expert | null) => {
        setSelectedExpert(expert);
        if (expert) {
            setCurrentExpert(expert.id, expert.name, expert.avatar);
        } else {
            setCurrentExpert(null);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isStreaming) return;

        // 添加用户消息
        const userMessage = {
            id: `msg-${Date.now()}`,
            role: 'user' as const,
            content: inputValue.trim(),
            timestamp: new Date().toISOString(),
            expertId: selectedExpert?.id,
            expertName: selectedExpert?.name,
        };
        addMessage(userMessage);

        // 保存当前输入用于请求，因为 setInputValue 会清空它
        const currentInput = inputValue.trim();
        setInputValue('');

        // AI 响应
        setStreaming(true);

        try {
            let assistantMessage: Message;
            if (USE_MOCK) {
                assistantMessage = await mockChatAPI(currentInput, selectedExpert);
            } else {
                assistantMessage = await sendMessage(currentInput, selectedExpert);
            }
            addMessage(assistantMessage);
        } catch (error) {
            console.error('Chat Error:', error);
            // 这里可以添加错误处理 Toast
        } finally {
            setStreaming(false);
        }
    };

    // 过滤专家列表
    const filteredExperts = AVAILABLE_EXPERTS.filter(expert =>
        expert.name.toLowerCase().includes(mentionFilter) ||
        expert.domain.toLowerCase().includes(mentionFilter)
    );

    return {
        state: {
            inputValue,
            isRecording,
            selectedExpert,
            showMentionList,
            mentionFilter,
            showHistory,
            showExportModal,
            exportConversation,
            currentConversation,
            isStreaming,
            filteredExperts
        },
        actions: {
            setInputValue,
            setIsRecording,
            setShowHistory,
            setShowExportModal,
            setExportConversation,
            setCurrentExpert,
            handleSelectConversation,
            handleNewConversation,
            handleExportConversation,
            handleInputChange,
            handleMentionSelect,
            handleExpertSelect,
            handleSend
        }
    };
};
