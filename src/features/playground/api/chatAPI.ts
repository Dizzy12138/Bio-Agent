import { Message } from '../../../types';

export interface ChatCompletionRequest {
    message: string;
    conversationId?: string;
    expertId?: string;
    // model overrides could go here
}

export interface StreamEvent {
    content?: string;
    conversationId?: string; // Backend might return this to sync IDs
    error?: string;
}

export const chatAPI = {
    /**
     * Send a message and get a streaming response
     */
    async sendMessageStream(
        params: ChatCompletionRequest,
        onChunk: (chunk: string) => void,
        onDone?: () => void,
        onError?: (err: Error) => void
    ): Promise<void> {
        try {
            const response = await fetch('/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            if (!response.body) {
                throw new Error('ReadableStream not supported in this browser.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Process complete lines from buffer
                const lines = buffer.split('\n\n'); // SSE events usually separated by double newline
                buffer = lines.pop() || ''; // Keep incomplete part in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6); // Remove 'data: ' prefix
                        if (data === '[DONE]') {
                            if (onDone) onDone();
                            return;
                        }
                        try {
                            const parsed: StreamEvent = JSON.parse(data);
                            if (parsed.content) {
                                onChunk(parsed.content);
                            }
                            if (parsed.error) {
                                if (onError) onError(new Error(parsed.error));
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', data);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Chat API Error:', error);
            if (onError) onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
};
