import React from 'react';
import { MessageList } from './MessageList';
import { ChatHistory } from './components/ChatHistory';
import { ConversationExportModal } from './components/ConversationExportModal';
import { ChatHeader } from './components/ChatHeader';
import { ExpertSelector } from './components/ExpertSelector';
import { ChatInputArea } from './components/ChatInputArea';
import { useChatController } from './hooks/useChatController';

export const ChatInterface: React.FC = () => {
    const { state, actions } = useChatController();

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-white relative">
            {/* 对话历史面板 */}
            <ChatHistory
                isOpen={state.showHistory}
                onClose={() => actions.setShowHistory(false)}
                onSelectConversation={actions.handleSelectConversation}
                onNewConversation={actions.handleNewConversation}
                onExportConversation={actions.handleExportConversation}
            />

            {/* 对话导出模态框 */}
            <ConversationExportModal
                isOpen={state.showExportModal}
                conversation={state.exportConversation}
                messages={state.currentConversation?.id === state.exportConversation?.id ? (state.currentConversation?.messages || []) : []}
                onClose={() => {
                    actions.setShowExportModal(false);
                    actions.setExportConversation(null);
                }}
            />

            {/* Header */}
            <ChatHeader
                currentConversation={state.currentConversation}
                selectedExpert={state.selectedExpert}
                onShowHistory={() => actions.setShowHistory(true)}
                onClearExpert={() => actions.handleExpertSelect(null)}
            >
                <ExpertSelector
                    selectedExpert={state.selectedExpert}
                    onSelect={actions.handleExpertSelect}
                    onNewConversation={actions.handleNewConversation}
                />
            </ChatHeader>

            {/* Message Area */}
            <div className="flex-1 overflow-hidden relative bg-gray-50/30 flex flex-col">
                <MessageList />
            </div>

            {/* Input Area */}
            <ChatInputArea
                inputValue={state.inputValue}
                onInputChange={actions.handleInputChange}
                onSend={actions.handleSend}
                isStreaming={state.isStreaming}
                isRecording={state.isRecording}
                onToggleRecording={() => actions.setIsRecording(!state.isRecording)}
                selectedExpert={state.selectedExpert}
                onMentionSelect={actions.handleMentionSelect}
                showMentionList={state.showMentionList}
                filteredExperts={state.filteredExperts}
            />
        </div>
    );
};
