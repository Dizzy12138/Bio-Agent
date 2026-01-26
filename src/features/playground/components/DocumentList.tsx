/**
 * DocumentList Component
 * A thumbnail list for selecting and managing uploaded documents.
 */

import React, { useRef } from 'react';
import { usePlaygroundStore, type DocumentFile } from '../stores/playgroundStore';
import { Upload, X, FileImage, FileText } from 'lucide-react';
import './DocumentList.css';

export const DocumentList: React.FC = () => {
    const {
        documents,
        activeDocumentId,
        setActiveDocument,
        addDocuments,
        removeDocument,
        clearDocuments,
    } = usePlaygroundStore();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newDocs: DocumentFile[] = [];

        for (const file of Array.from(files)) {
            const isImage = file.type.startsWith('image/');
            const isPdf = file.type === 'application/pdf';

            if (!isImage && !isPdf) {
                console.warn(`Skipping unsupported file: ${file.name}`);
                continue;
            }

            // Create object URL for preview
            const url = URL.createObjectURL(file);

            // Read as base64 for VLM (only for images for now)
            let base64: string | undefined;
            if (isImage) {
                base64 = await fileToBase64(file);
            }

            newDocs.push({
                id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: file.name,
                type: isImage ? 'image' : 'pdf',
                url,
                file,
                base64,
            });
        }

        if (newDocs.length > 0) {
            addDocuments(newDocs);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="document-list">
            <div className="document-list__header">
                <h4>📁 Documents ({documents.length})</h4>
                <div className="header-actions">
                    {documents.length > 0 && (
                        <button
                            className="btn-clear"
                            onClick={clearDocuments}
                            title="Clear all documents"
                        >
                            Clear
                        </button>
                    )}
                    <button className="btn-upload" onClick={handleUploadClick}>
                        <Upload size={14} />
                        Upload
                    </button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            <div className="document-list__items">
                {documents.length === 0 ? (
                    <div className="empty-state" onClick={handleUploadClick}>
                        <Upload size={24} />
                        <p>Click to upload documents</p>
                        <span>Supports images and PDFs</span>
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div
                            key={doc.id}
                            className={`document-item ${activeDocumentId === doc.id ? 'active' : ''}`}
                            onClick={() => setActiveDocument(doc.id)}
                        >
                            <div className="doc-thumbnail">
                                {doc.type === 'image' ? (
                                    <img src={doc.url} alt={doc.name} />
                                ) : (
                                    <div className="pdf-icon">
                                        <FileText size={20} />
                                    </div>
                                )}
                            </div>
                            <div className="doc-info">
                                <span className="doc-name" title={doc.name}>
                                    {doc.name}
                                </span>
                                <span className="doc-type">
                                    {doc.type === 'image' ? <FileImage size={12} /> : <FileText size={12} />}
                                    {doc.type.toUpperCase()}
                                </span>
                            </div>
                            <button
                                className="btn-remove"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeDocument(doc.id);
                                }}
                                title="Remove document"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

/** Convert File to base64 string */
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/png;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default DocumentList;
