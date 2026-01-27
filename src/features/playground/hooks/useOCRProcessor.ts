/**
 * useOCRProcessor Hook
 * 
 * Handles the OCR processing workflow - runs batch processing 
 * and updates queue status. Uses mock adapter by default.
 */

import { useCallback } from 'react';
import { usePlaygroundStore } from '../stores/playgroundStore';
import { processDocument, getOCRConfig } from '../services/ocrService';

export function useOCRProcessor() {
    const {
        ocrQueue,
        updateOCRQueueItem,
        setOCRBatchProgress,
        setIsOCRProcessing,
        addDocuments,
        addMessage,
    } = usePlaygroundStore();

    /**
     * Start processing all pending items in OCR queue
     */
    const startProcessing = useCallback(async () => {
        const pendingItems = ocrQueue.filter(item => item.status === 'pending');

        if (pendingItems.length === 0) {
            addMessage({
                id: `msg-${Date.now()}`,
                role: 'system',
                content: '⚠️ 队列中没有待处理的文档',
                timestamp: new Date(),
            });
            return;
        }

        setIsOCRProcessing(true);
        const config = getOCRConfig();

        let completed = 0;
        let failed = 0;
        const processedDocs: { id: string; fileName: string; text: string }[] = [];

        for (const item of pendingItems) {
            // Update status to processing
            updateOCRQueueItem(item.id, { status: 'processing', progress: 0 });

            setOCRBatchProgress({
                total: pendingItems.length,
                completed,
                failed,
                currentFile: item.fileName,
            });

            try {
                // Check if it's a TXT file - read directly without OCR
                if (item.file.type === 'text/plain') {
                    updateOCRQueueItem(item.id, { progress: 50 });

                    const text = await item.file.text();

                    updateOCRQueueItem(item.id, {
                        status: 'completed',
                        progress: 100,
                        extractedText: text,
                    });

                    processedDocs.push({
                        id: item.id,
                        fileName: item.fileName,
                        text: text,
                    });

                    completed++;
                } else {
                    // Process with OCR for PDF/images
                    updateOCRQueueItem(item.id, { progress: 30 });

                    const result = await processDocument(item.file, config);

                    updateOCRQueueItem(item.id, { progress: 80 });

                    if (result.status === 'completed' && result.extractedText) {
                        updateOCRQueueItem(item.id, {
                            status: 'completed',
                            progress: 100,
                            extractedText: result.extractedText,
                        });

                        processedDocs.push({
                            id: item.id,
                            fileName: item.fileName,
                            text: result.extractedText,
                        });

                        completed++;
                    } else {
                        throw new Error(result.error || 'Processing failed');
                    }
                }
            } catch (error) {
                updateOCRQueueItem(item.id, {
                    status: 'error',
                    progress: 0,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                failed++;
            }

            setOCRBatchProgress({
                total: pendingItems.length,
                completed,
                failed,
                currentFile: undefined,
            });
        }

        setIsOCRProcessing(false);

        // Add processed documents to the document list
        if (processedDocs.length > 0) {
            // Create DocumentFile entries for successfully processed files
            const docFiles = ocrQueue
                .filter(item => processedDocs.some(p => p.id === item.id))
                .map(item => {
                    let docType: 'pdf' | 'image' | 'text';
                    if (item.file.type === 'application/pdf') {
                        docType = 'pdf';
                    } else if (item.file.type === 'text/plain') {
                        docType = 'text';
                    } else {
                        docType = 'image';
                    }

                    return {
                        id: item.id,
                        name: item.fileName,
                        type: docType,
                        url: docType === 'text' ? '' : URL.createObjectURL(item.file),
                        file: item.file,
                        extractedText: processedDocs.find(p => p.id === item.id)?.text,
                    };
                });

            addDocuments(docFiles);
        }

        // Show completion message
        addMessage({
            id: `msg-${Date.now()}`,
            role: 'agent',
            content: `✅ OCR 处理完成！\n\n成功: ${completed} 个文档\n失败: ${failed} 个文档\n\n${completed > 0 ? '已提取的文本内容已添加到文档列表。您可以开始定义提取字段了。' : ''}`,
            timestamp: new Date(),
        });

    }, [ocrQueue, updateOCRQueueItem, setOCRBatchProgress, setIsOCRProcessing, addDocuments, addMessage]);

    return {
        startProcessing,
        isProcessing: usePlaygroundStore.getState().isOCRProcessing,
        progress: usePlaygroundStore.getState().ocrBatchProgress,
    };
}

export default useOCRProcessor;
