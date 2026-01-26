/**
 * DocumentViewer Component (Enhanced with PDF Support)
 * 
 * Features:
 * - Image viewing with zoom
 * - PDF rendering via pdf.js v5
 * - Visual Grounding overlays (bounding boxes)
 * - Page navigation for multi-page PDFs
 */

import React, { useEffect, useRef, useState } from 'react';
import { usePlaygroundStore } from '../stores/playgroundStore';
import { ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, FileText, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import * as pdfjsLib from 'pdfjs-dist';
import { getMinerUConfig } from '../services/mineruAdapter';
import './DocumentViewer.css';

// Configure PDF.js v5 worker - use local worker from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

type ViewMode = 'pdf' | 'markdown';

export const DocumentViewer: React.FC = () => {
    const { documents, activeDocumentId, visualGrounding } = usePlaygroundStore();

    const activeDoc = documents.find((d) => d.id === activeDocumentId);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('pdf');
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Load PDF document
    useEffect(() => {
        if (!activeDoc || activeDoc.type !== 'pdf') {
            setPdfDoc(null);
            setTotalPages(1);
            setCurrentPage(1);
            setLoadError(null);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setLoadError(null);

        const loadPdf = async () => {
            try {
                let source: { data: ArrayBuffer } | { url: string };

                // For file objects, read as ArrayBuffer
                if (activeDoc.file) {
                    const arrayBuffer = await activeDoc.file.arrayBuffer();
                    source = { data: arrayBuffer };
                } else {
                    // For URL-based documents
                    source = { url: activeDoc.url };
                }

                if (cancelled) return;

                const loadingTask = pdfjsLib.getDocument(source);
                const pdf = await loadingTask.promise;

                if (cancelled) {
                    pdf.destroy();
                    return;
                }

                setPdfDoc(pdf);
                setTotalPages(pdf.numPages);
                setCurrentPage(1);
            } catch (error) {
                console.error('Failed to load PDF:', error);
                if (!cancelled) {
                    setLoadError(error instanceof Error ? error.message : 'Failed to load PDF');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadPdf();

        return () => {
            cancelled = true;
        };
    }, [activeDoc?.id, activeDoc?.type, activeDoc?.url, activeDoc?.file]);

    // Cleanup PDF doc on unmount
    useEffect(() => {
        return () => {
            pdfDoc?.destroy();
        };
    }, [pdfDoc]);

    // Render PDF page
    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;

        let cancelled = false;

        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(currentPage);
                if (cancelled) return;

                const canvas = canvasRef.current!;
                const context = canvas.getContext('2d');
                if (!context) return;

                const viewport = page.getViewport({ scale: zoom, rotation });
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas,
                };

                await page.render(renderContext).promise;
            } catch (error) {
                console.error('Failed to render page:', error);
            }
        };

        renderPage();

        return () => {
            cancelled = true;
        };
    }, [pdfDoc, currentPage, zoom, rotation]);

    // Reset zoom/rotation when document changes
    useEffect(() => {
        setZoom(1);
        setRotation(0);
    }, [activeDocumentId]);

    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
    const handleRotate = () => setRotation((r) => (r + 90) % 360);
    const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
    const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

    // Calculate bounding box style
    const showBoundingBox =
        visualGrounding.documentId === activeDocumentId && visualGrounding.boundingBox;
    const [bbX, bbY, bbW, bbH] = visualGrounding.boundingBox || [0, 0, 0, 0];

    if (!activeDoc) {
        return (
            <div className="document-viewer document-viewer--empty">
                <div className="empty-state">
                    <span className="empty-icon">📄</span>
                    <p>No document selected</p>
                    <p className="empty-hint">Upload or select a document to view</p>
                </div>
            </div>
        );
    }

    return (
        <div className="document-viewer">
            {/* Header with controls */}
            <div className="document-viewer__header">
                <div className="doc-info">
                    <span className="doc-name" title={activeDoc.name}>
                        {activeDoc.name}
                    </span>
                    <span className="doc-type-badge">{activeDoc.type.toUpperCase()}</span>
                    {/* View Mode Toggle */}
                    {activeDoc.extractedText && (
                        <div className="view-mode-toggle">
                            <button
                                className={`toggle-btn ${viewMode === 'pdf' ? 'active' : ''}`}
                                onClick={() => setViewMode('pdf')}
                                title="查看 PDF 原文"
                            >
                                <Eye size={14} />
                                PDF
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'markdown' ? 'active' : ''}`}
                                onClick={() => setViewMode('markdown')}
                                title="查看 OCR 文本"
                            >
                                <FileText size={14} />
                                文本
                            </button>
                        </div>
                    )}
                </div>
                {viewMode === 'pdf' && (
                    <div className="viewer-controls">
                        <button onClick={handleZoomOut} title="Zoom Out" disabled={zoom <= 0.25}>
                            <ZoomOut size={14} />
                        </button>
                        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                        <button onClick={handleZoomIn} title="Zoom In" disabled={zoom >= 3}>
                            <ZoomIn size={14} />
                        </button>
                        <div className="control-divider" />
                        <button onClick={handleRotate} title="Rotate">
                            <RotateCw size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* PDF Page Navigation */}
            {activeDoc.type === 'pdf' && totalPages > 1 && (
                <div className="page-nav">
                    <button onClick={handlePrevPage} disabled={currentPage <= 1}>
                        <ChevronLeft size={16} />
                    </button>
                    <span>
                        Page {currentPage} / {totalPages}
                    </span>
                    <button onClick={handleNextPage} disabled={currentPage >= totalPages}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Document Content */}
            <div className="document-viewer__content" ref={containerRef}>
                {isLoading && (
                    <div className="loading-overlay">
                        <div className="spinner-large" />
                        <p>Loading PDF...</p>
                    </div>
                )}

                {loadError && (
                    <div className="error-state">
                        <span className="error-icon">⚠️</span>
                        <p>无法加载 PDF</p>
                        <p className="error-detail">{loadError}</p>
                    </div>
                )}

                {activeDoc.type === 'image' && (
                    <div
                        className="image-container"
                        style={{
                            transform: `scale(${zoom}) rotate(${rotation}deg)`,
                            transformOrigin: 'center center',
                        }}
                    >
                        <img src={activeDoc.url} alt={activeDoc.name} />
                        {showBoundingBox && (
                            <div
                                className="bounding-box"
                                style={{
                                    left: `${bbX}%`,
                                    top: `${bbY}%`,
                                    width: `${bbW}%`,
                                    height: `${bbH}%`,
                                }}
                            />
                        )}
                    </div>
                )}

                {activeDoc.type === 'pdf' && !loadError && viewMode === 'pdf' && (
                    <div className="pdf-container">
                        <canvas ref={canvasRef} className="pdf-canvas" />
                        {showBoundingBox && (
                            <div
                                className="bounding-box"
                                style={{
                                    left: `${bbX}%`,
                                    top: `${bbY}%`,
                                    width: `${bbW}%`,
                                    height: `${bbH}%`,
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Markdown View - OCR Extracted Text */}
                {viewMode === 'markdown' && activeDoc.extractedText && (
                    <div className="markdown-container">
                        <div className="markdown-header">
                            <span className="ocr-badge">✅ OCR 提取完成</span>
                            <span className="char-count">
                                {activeDoc.extractedText.length.toLocaleString()} 字符
                            </span>
                        </div>
                        <div className="markdown-content prose">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                components={{
                                    // Custom image renderer to handle MinerU image paths
                                    img: ({ src, alt, ...props }) => {
                                        // Transform relative paths to full API URLs
                                        let imageSrc = src || '';

                                        // If path is relative and not a data URL, prepend API base URL
                                        if (imageSrc && !imageSrc.startsWith('http') && !imageSrc.startsWith('data:')) {
                                            const mineruConfig = getMinerUConfig();
                                            if (mineruConfig?.apiUrl) {
                                                // Construct full URL from API base
                                                const baseUrl = mineruConfig.apiUrl.replace(/\/$/, '');
                                                imageSrc = `${baseUrl}/${imageSrc.replace(/^\//, '')}`;
                                            }
                                        }

                                        return (
                                            <img
                                                src={imageSrc}
                                                alt={alt || 'Document image'}
                                                loading="lazy"
                                                onError={(e) => {
                                                    // Hide broken images
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                                {...props}
                                            />
                                        );
                                    },
                                }}
                            >
                                {activeDoc.extractedText}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                {viewMode === 'markdown' && !activeDoc.extractedText && (
                    <div className="no-ocr-state">
                        <span className="no-ocr-icon">📄</span>
                        <p>尚未进行 OCR 处理</p>
                        <p className="no-ocr-hint">请在右侧面板完成 OCR 处理</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentViewer;
