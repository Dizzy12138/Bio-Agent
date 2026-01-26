/**
 * PlaygroundLayout Component (Fully Resizable)
 * 
 * Layout:
 *   - Left: Document Viewer (resizable width)
 *   - Right: BatchUploader + Data Grid + Chat (resizable heights)
 */

import React, { useState, useCallback, useRef } from 'react';
import { usePlaygroundStore } from '../stores/playgroundStore';
import { DocumentViewer } from './DocumentViewer';
import { DataGrid } from './DataGrid';
import { PlaygroundChat } from './PlaygroundChat';
import { BatchUploader } from './BatchUploader';
import { Button } from '../../../components/common';
import { Upload, RotateCcw, FileImage, X, ChevronDown, ChevronUp, GripHorizontal, GripVertical } from 'lucide-react';
import './PlaygroundLayout.css';

// Reusable resize hook
function useResize(
    initialValue: number,
    min: number,
    max: number,
    direction: 'horizontal' | 'vertical'
) {
    const [size, setSize] = useState(initialValue);
    const isDragging = useRef(false);
    const startPos = useRef(0);
    const startSize = useRef(0);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
        startSize.current = size;
        document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const delta = (direction === 'horizontal' ? e.clientX : e.clientY) - startPos.current;
            const newSize = Math.max(min, Math.min(max, startSize.current + delta));
            setSize(newSize);
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [size, min, max, direction]);

    return { size, handleMouseDown };
}

export const PlaygroundLayout: React.FC = () => {
    const {
        documents,
        schema,
        correctionHistory,
        loadSampleData,
        reset,
        activeDocumentId,
        setActiveDocument,
        addDocuments,
        removeDocument,
        ocrQueue,
    } = usePlaygroundStore();

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [showBatchUploader, setShowBatchUploader] = useState(true);

    // Resizable panels
    const { size: leftWidth, handleMouseDown: handleHorizontalResize } = useResize(500, 300, 800, 'horizontal');
    const { size: gridHeight, handleMouseDown: handleGridResize } = useResize(250, 100, 500, 'vertical');

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newDocs = await Promise.all(
            Array.from(files)
                .filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf')
                .map(async (file) => ({
                    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    name: file.name,
                    type: file.type.startsWith('image/') ? 'image' as const : 'pdf' as const,
                    url: URL.createObjectURL(file),
                    file,
                }))
        );

        if (newDocs.length > 0) {
            addDocuments(newDocs);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Header Bar */}
            <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-200 shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            📄
                        </div>
                        <h1 className="text-lg font-bold text-gray-900">信息提取工作台</h1>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                        <span className="text-gray-600">{documents.length} 文档</span>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <span className="text-gray-600">{schema.length} 字段</span>
                        {ocrQueue.length > 0 && (
                            <>
                                <div className="w-px h-3 bg-gray-300"></div>
                                <span className="text-blue-600">{ocrQueue.length} 队列</span>
                            </>
                        )}
                        {correctionHistory.length > 0 && (
                            <>
                                <div className="w-px h-3 bg-gray-300"></div>
                                <span className="text-green-600">{correctionHistory.length} 修正</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        hidden
                    />
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={14} className="mr-1.5" /> 上传文档
                    </Button>
                    <Button variant="primary" size="sm" onClick={loadSampleData}>
                        加载示例
                    </Button>
                    <button
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={reset}
                        title="重置"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>
            </header>

            {/* Main Split Layout */}
            <main className="flex-1 flex min-h-0 overflow-hidden">
                {/* Left: Document Viewer with Tabs */}
                <section
                    className="flex flex-col bg-white border-r border-gray-200 relative shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-0"
                    style={{ width: leftWidth, minWidth: leftWidth }}
                >
                    {/* Document Tabs */}
                    {documents.length > 0 && (
                        <div className="flex items-center gap-1 p-2 border-b border-gray-100 overflow-x-auto scrollbar-none bg-gray-50">
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${activeDocumentId === doc.id
                                        ? 'bg-white text-blue-600 border-blue-100 shadow-sm'
                                        : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-200/50'
                                        }`}
                                    onClick={() => setActiveDocument(doc.id)}
                                >
                                    <FileImage size={12} className={activeDocumentId === doc.id ? 'text-blue-500' : 'text-gray-400'} />
                                    <span className="truncate max-w-[120px]">{doc.name}</span>
                                    <button
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-0.5 rounded-full hover:bg-red-50 transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeDocument(doc.id);
                                        }}
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex-1 bg-gray-100/50 p-4 overflow-hidden flex items-center justify-center">
                        <div className="w-full h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
                            <DocumentViewer />
                        </div>
                    </div>
                </section>

                {/* Horizontal Resize Handle */}
                <div
                    className="w-1 bg-gray-50 hover:bg-blue-200 cursor-col-resize flex items-center justify-center border-r border-gray-200 z-10 transition-colors group"
                    onMouseDown={handleHorizontalResize}
                >
                    <div className="h-8 w-1 bg-gray-300 rounded-full group-hover:bg-blue-400 transition-colors" />
                </div>

                {/* Right: BatchUploader + DataGrid + Chat (Resizable) */}
                <section className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
                    {/* Collapsible Batch Uploader */}
                    <div className="border-b border-gray-200 bg-white">
                        <div
                            className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer select-none border-l-4 border-transparent hover:border-blue-500 transition-colors"
                            onClick={() => setShowBatchUploader(!showBatchUploader)}
                        >
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                批量文档处理
                            </span>
                            {showBatchUploader ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </div>
                        {showBatchUploader && (
                            <div className="p-4 bg-gray-50/30">
                                <BatchUploader />
                            </div>
                        )}
                    </div>

                    {/* Resizable DataGrid */}
                    <div
                        className="bg-white border-b border-gray-200 relative flex flex-col"
                        style={{ height: gridHeight, minHeight: gridHeight }}
                    >
                        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                提取结果预览
                            </span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <DataGrid />
                        </div>
                    </div>

                    {/* Resize Handle */}
                    <div
                        className="h-1 bg-gray-50 hover:bg-blue-200 cursor-row-resize flex items-center justify-center border-b border-gray-200 z-10 transition-colors group shrink-0"
                        onMouseDown={handleGridResize}
                    >
                        <div className="w-8 h-1 bg-gray-300 rounded-full group-hover:bg-blue-400 transition-colors" />
                    </div>

                    {/* Chat takes remaining space */}
                    <div className="flex-1 bg-white min-h-0 flex flex-col">
                        <PlaygroundChat />
                    </div>
                </section>
            </main>
        </div>
    );
};

export default PlaygroundLayout;
