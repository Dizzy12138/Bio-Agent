import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, Conversation } from '../types';

interface ChatState {
    // Current conversation
    currentConversation: Conversation | null;
    messages: Message[];
    isStreaming: boolean;

    // Conversation list
    conversations: Conversation[];

    // Current expert context
    currentExpertId: string | null;
    currentExpertName: string | null;
    currentExpertAvatar: string | null;

    // Actions
    setCurrentConversation: (conversation: Conversation | null) => void;
    createNewConversation: (expertId?: string, expertName?: string, expertAvatar?: string) => Conversation;
    addMessage: (message: Message) => void;
    updateMessage: (messageId: string, content: string) => void;
    clearMessages: () => void;
    setStreaming: (isStreaming: boolean) => void;

    // Expert context
    setCurrentExpert: (expertId: string | null, expertName?: string, expertAvatar?: string) => void;

    // Conversation actions
    addConversation: (conversation: Conversation) => void;
    updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
    removeConversation: (conversationId: string) => void;
    pinConversation: (conversationId: string, isPinned: boolean) => void;
    favoriteConversation: (conversationId: string, isFavorite: boolean) => void;
    addTagToConversation: (conversationId: string, tagId: string) => void;
    removeTagFromConversation: (conversationId: string, tagId: string) => void;
    favoriteMessage: (messageId: string, isFavorite: boolean) => void;

    // History helpers
    getConversationsByExpert: (expertId: string) => Conversation[];
    getRecentConversations: (limit?: number) => Conversation[];
    getFavoriteConversations: () => Conversation[];
    getConversationsByTag: (tagId: string) => Conversation[];
}

// Mock 历史对话数据
const mockConversations: Conversation[] = [
    {
        id: 'conv-1',
        title: '糖尿病足溃疡治疗方案咨询',
        expertId: 'expert-1',
        expertName: '创面护理专家',
        expertAvatar: '🩹',
        messages: [],
        messageCount: 8,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
        isPinned: true,
    },
    {
        id: 'conv-2',
        title: '海藻酸钠水凝胶配方优化',
        expertId: 'expert-2',
        expertName: '生物材料分析师',
        expertAvatar: '🧬',
        messages: [],
        messageCount: 12,
        createdAt: '2024-01-14T14:00:00Z',
        updatedAt: '2024-01-14T15:30:00Z',
    },
    {
        id: 'conv-3',
        title: '创面敷料文献综述',
        expertId: 'expert-3',
        expertName: '文献综述助手',
        expertAvatar: '📚',
        messages: [],
        messageCount: 6,
        createdAt: '2024-01-13T09:00:00Z',
        updatedAt: '2024-01-13T10:00:00Z',
    },
    {
        id: 'conv-4',
        title: '压疮护理指南',
        expertId: 'expert-1',
        expertName: '创面护理专家',
        expertAvatar: '🩹',
        messages: [],
        messageCount: 5,
        createdAt: '2024-01-12T16:00:00Z',
        updatedAt: '2024-01-12T16:45:00Z',
    },
    {
        id: 'conv-5',
        title: '壳聚糖生物相容性分析',
        expertId: 'expert-2',
        expertName: '生物材料分析师',
        expertAvatar: '🧬',
        messages: [],
        messageCount: 9,
        createdAt: '2024-01-11T11:00:00Z',
        updatedAt: '2024-01-11T12:30:00Z',
    },
];

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            currentConversation: null,
            messages: [],
            isStreaming: false,
            conversations: mockConversations,
            currentExpertId: null,
            currentExpertName: null,
            currentExpertAvatar: null,

            setCurrentConversation: (conversation) => set({
                currentConversation: conversation,
                messages: conversation?.messages || [],
                currentExpertId: conversation?.expertId || null,
                currentExpertName: conversation?.expertName || null,
                currentExpertAvatar: conversation?.expertAvatar || null,
            }),

            createNewConversation: (expertId, expertName, expertAvatar) => {
                const newConversation: Conversation = {
                    id: `conv-${Date.now()}`,
                    title: expertName ? `与 ${expertName} 的对话` : '新对话',
                    expertId,
                    expertName,
                    expertAvatar,
                    messages: [],
                    messageCount: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                set((state) => ({
                    conversations: [newConversation, ...state.conversations],
                    currentConversation: newConversation,
                    messages: [],
                    currentExpertId: expertId || null,
                    currentExpertName: expertName || null,
                    currentExpertAvatar: expertAvatar || null,
                }));
                return newConversation;
            },

            addMessage: (message) => set((state) => {
                const newMessages = [...state.messages, message];
                // 更新当前对话
                if (state.currentConversation) {
                    const updatedConv = {
                        ...state.currentConversation,
                        messages: newMessages,
                        messageCount: newMessages.length,
                        updatedAt: new Date().toISOString(),
                        // 自动生成标题
                        title: state.currentConversation.messageCount === 0 && message.role === 'user'
                            ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
                            : state.currentConversation.title,
                    };
                    return {
                        messages: newMessages,
                        currentConversation: updatedConv,
                        conversations: state.conversations.map(c =>
                            c.id === updatedConv.id ? updatedConv : c
                        ),
                    };
                }
                return { messages: newMessages };
            }),

            updateMessage: (messageId, content) => set((state) => ({
                messages: state.messages.map(m =>
                    m.id === messageId ? { ...m, content } : m
                ),
            })),

            clearMessages: () => set({ messages: [] }),

            setStreaming: (isStreaming) => set({ isStreaming }),

            setCurrentExpert: (expertId, expertName, expertAvatar) => set({
                currentExpertId: expertId,
                currentExpertName: expertName || null,
                currentExpertAvatar: expertAvatar || null,
            }),

            addConversation: (conversation) => set((state) => ({
                conversations: [conversation, ...state.conversations],
            })),

            updateConversation: (conversationId, updates) => set((state) => ({
                conversations: state.conversations.map(c =>
                    c.id === conversationId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
                ),
            })),

            removeConversation: (conversationId) => set((state) => ({
                conversations: state.conversations.filter(c => c.id !== conversationId),
                currentConversation: state.currentConversation?.id === conversationId
                    ? null
                    : state.currentConversation,
            })),

            pinConversation: (conversationId, isPinned) => set((state) => ({
                conversations: state.conversations.map(c =>
                    c.id === conversationId ? { ...c, isPinned } : c
                ),
            })),

            favoriteConversation: (conversationId, isFavorite) => set((state) => ({
                conversations: state.conversations.map(c =>
                    c.id === conversationId ? { ...c, isFavorite } : c
                ),
            })),

            addTagToConversation: (conversationId, tagId) => set((state) => ({
                conversations: state.conversations.map(c => {
                    if (c.id === conversationId) {
                        const currentTags = c.tags || [];
                        if (!currentTags.includes(tagId)) {
                            return { ...c, tags: [...currentTags, tagId] };
                        }
                    }
                    return c;
                }),
            })),

            removeTagFromConversation: (conversationId, tagId) => set((state) => ({
                conversations: state.conversations.map(c => {
                    if (c.id === conversationId && c.tags) {
                        return { ...c, tags: c.tags.filter(t => t !== tagId) };
                    }
                    return c;
                }),
            })),

            favoriteMessage: (messageId, isFavorite) => set((state) => {
                if (!state.currentConversation) return {};

                const updatedMessages = state.messages.map(m =>
                    m.id === messageId ? { ...m, isFavorite } : m
                );

                return {
                    messages: updatedMessages,
                    currentConversation: {
                        ...state.currentConversation,
                        messages: updatedMessages,
                    },
                };
            }),

            getConversationsByExpert: (expertId) => {
                return get().conversations.filter(c => c.expertId === expertId);
            },

            getRecentConversations: (limit = 10) => {
                return get().conversations
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, limit);
            },

            getFavoriteConversations: () => {
                return get().conversations.filter(c => c.isFavorite);
            },

            getConversationsByTag: (tagId) => {
                return get().conversations.filter(c => c.tags?.includes(tagId));
            },
        }),
        {
            name: 'biomed-chat-storage',
            partialize: (state) => ({
                conversations: state.conversations,
            }),
        }
    )
);

