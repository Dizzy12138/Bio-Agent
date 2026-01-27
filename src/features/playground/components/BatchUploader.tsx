/**
 * BatchUploader Component
 * 
 * Allows drag-and-drop upload of multiple documents for OCR processing.
 * Supports up to 300 files, shows queue and batch progress.
 */

import React, { useCallback, useRef, useState } from 'react';
import { usePlaygroundStore } from '../stores/playgroundStore';
import { useOCRProcessor } from '../hooks/useOCRProcessor';
import { Upload, FileText, X, Play, Trash2 } from 'lucide-react';
import { getSupportedExtensions, isSupportedFile, formatFileSize } from '../services/ocrService';
import './BatchUploader.css';

const MAX_FILES = 300;

export const BatchUploader: React.FC = () => {
    const {
        ocrQueue,
        ocrBatchProgress,
        addToOCRQueue,
        removeFromOCRQueue,
        clearOCRQueue,
        isOCRProcessing,
    } = usePlaygroundStore();

    const { startProcessing } = useOCRProcessor();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFiles = useCallback((files: FileList | File[]) => {
        const fileArray = Array.from(files);

        // Filter supported files
        const validFiles = fileArray.filter(isSupportedFile);

        // Check max limit
        const remainingSlots = MAX_FILES - ocrQueue.length;
        const filesToAdd = validFiles.slice(0, remainingSlots);

        if (filesToAdd.length > 0) {
            addToOCRQueue(filesToAdd);
        }

        if (validFiles.length > remainingSlots) {
            alert(`最多支持 ${MAX_FILES} 个文件。已添加 ${filesToAdd.length} 个文件。`);
        }

        if (validFiles.length < fileArray.length) {
            const skipped = fileArray.length - validFiles.length;
            console.warn(`跳过 ${skipped} 个不支持的文件类型`);
        }
    }, [ocrQueue.length, addToOCRQueue]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(e.target.files);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const pendingCount = ocrQueue.filter(q => q.status === 'pending').length;
    const completedCount = ocrQueue.filter(q => q.status === 'completed').length;
    const errorCount = ocrQueue.filter(q => q.status === 'error').length;

    return (
        <div className="batch-uploader">
            <div className="batch-uploader__header">
                <h4>📁 批量文档处理</h4>
                <div className="queue-stats">
                    <span className="stat">{ocrQueue.length} / {MAX_FILES}</span>
                    {completedCount > 0 && <span className="stat success">✓ {completedCount}</span>}
                    {errorCount > 0 && <span className="stat error">✗ {errorCount}</span>}
                </div>
            </div>

            {/* Drop Zone */}
            <div
                className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={getSupportedExtensions()}
                    onChange={handleFileChange}
                    hidden
                />
                <Upload size={32} />
                <p>拖拽文件到此处，或点击选择</p>
                <span className="supported-types">支持 PDF、PNG、JPG、TIFF、TXT</span>
            </div>

            {/* Queue List */}
            {ocrQueue.length > 0 && (
                <div className="queue-section">
                    <div className="queue-header">
                        <span>待处理队列 ({pendingCount})</span>
                        <div className="queue-actions">
                            <button
                                className="btn-icon"
                                onClick={clearOCRQueue}
                                disabled={isOCRProcessing}
                                title="清空队列"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="queue-list">
                        {ocrQueue.slice(0, 10).map((item) => (
                            <div key={item.id} className={`queue-item status-${item.status}`}>
                                <FileText size={16} />
                                <div className="item-info">
                                    <span className="item-name">{item.fileName}</span>
                                    <span className="item-size">{formatFileSize(item.fileSize)}</span>
                                </div>
                                <div className="item-status">
                                    {item.status === 'pending' && '等待中'}
                                    {item.status === 'processing' && `${item.progress}%`}
                                    {item.status === 'completed' && '✓'}
                                    {item.status === 'error' && '✗'}
                                </div>
                                {item.status === 'pending' && !isOCRProcessing && (
                                    <button
                                        className="btn-remove"
                                        onClick={() => removeFromOCRQueue(item.id)}
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {ocrQueue.length > 10 && (
                            <div className="queue-more">
                                还有 {ocrQueue.length - 10} 个文件...
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {ocrBatchProgress && (
                        <div className="batch-progress">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${((ocrBatchProgress.completed + ocrBatchProgress.failed) / ocrBatchProgress.total) * 100}%` }}
                                />
                            </div>
                            <span className="progress-text">
                                {ocrBatchProgress.currentFile || `${ocrBatchProgress.completed + ocrBatchProgress.failed} / ${ocrBatchProgress.total}`}
                            </span>
                        </div>
                    )}

                    {/* Start Button */}
                    {pendingCount > 0 && (
                        <button
                            className="btn-start-ocr"
                            onClick={startProcessing}
                            disabled={isOCRProcessing}
                        >
                            {isOCRProcessing ? (
                                <>处理中...</>
                            ) : (
                                <>
                                    <Play size={16} />
                                    开始 OCR 处理 ({pendingCount} 个文件)
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default BatchUploader;
