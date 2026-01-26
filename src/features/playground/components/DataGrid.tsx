/**
 * DataGrid Component
 * An editable table for viewing/correcting extracted data.
 * - Rows = Documents
 * - Columns = Schema Fields
 * - Supports confidence heatmap and cell click for visual grounding.
 */

import React, { useState } from 'react';
import { usePlaygroundStore } from '../stores/playgroundStore';
import type { ExtractedCell } from '../stores/playgroundStore';
import './DataGrid.css';

export const DataGrid: React.FC = () => {
    const {
        documents,
        schema,
        extractedRows,
        updateCell,
        setActiveDocument,
        setVisualGrounding,
    } = usePlaygroundStore();

    const [editingCell, setEditingCell] = useState<{ docId: string; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');

    if (schema.length === 0) {
        return (
            <div className="data-grid data-grid--empty">
                <div className="empty-state">
                    <span className="empty-icon">📊</span>
                    <p>No schema defined</p>
                    <p className="empty-hint">Use the Agent to define extraction fields</p>
                </div>
            </div>
        );
    }

    const handleCellClick = (docId: string, fieldName: string, cell: ExtractedCell | undefined) => {
        // Set active document
        setActiveDocument(docId);
        // Set visual grounding if bounding box exists
        if (cell?.boundingBox) {
            setVisualGrounding({
                documentId: docId,
                fieldName: fieldName,
                boundingBox: cell.boundingBox,
            });
        }
    };

    const handleCellDoubleClick = (docId: string, fieldName: string, currentValue: string | number | null) => {
        setEditingCell({ docId, field: fieldName });
        setEditValue(String(currentValue ?? ''));
    };

    const handleEditBlur = () => {
        if (editingCell) {
            const parsed = schema.find((s) => s.name === editingCell.field)?.type === 'number'
                ? parseFloat(editValue) || 0
                : editValue;
            updateCell(editingCell.docId, editingCell.field, parsed);
        }
        setEditingCell(null);
        setEditValue('');
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleEditBlur();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            setEditValue('');
        }
    };

    const getConfidenceClass = (confidence: number): string => {
        if (confidence >= 0.9) return 'confidence-high';
        if (confidence >= 0.7) return 'confidence-medium';
        return 'confidence-low';
    };

    return (
        <div className="data-grid">
            <div className="data-grid__header">
                <h3>📋 Extracted Data</h3>
                <span className="row-count">{extractedRows.length} documents</span>
            </div>
            <div className="data-grid__table-wrapper">
                <table className="data-grid__table">
                    <thead>
                        <tr>
                            <th className="th-document">Document</th>
                            {schema.map((field) => (
                                <th key={field.name}>
                                    {field.name}
                                    {field.required && <span className="required-marker">*</span>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {extractedRows.map((row) => {
                            const doc = documents.find((d) => d.id === row.documentId);
                            return (
                                <tr key={row.documentId}>
                                    <td className="td-document">
                                        <span className="doc-icon">📄</span>
                                        {doc?.name || row.documentId}
                                    </td>
                                    {schema.map((field) => {
                                        const cell = row.values[field.name];
                                        const isEditing =
                                            editingCell?.docId === row.documentId &&
                                            editingCell?.field === field.name;

                                        return (
                                            <td
                                                key={field.name}
                                                className={`td-cell ${getConfidenceClass(cell?.confidence ?? 0)} ${cell?.corrected ? 'corrected' : ''}`}
                                                onClick={() => handleCellClick(row.documentId, field.name, cell)}
                                                onDoubleClick={() =>
                                                    handleCellDoubleClick(row.documentId, field.name, cell?.value ?? null)
                                                }
                                                title={`Confidence: ${((cell?.confidence ?? 0) * 100).toFixed(0)}%${cell?.corrected ? ' (Corrected)' : ''}`}
                                            >
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="cell-edit-input"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={handleEditBlur}
                                                        onKeyDown={handleEditKeyDown}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="cell-value">
                                                        {cell?.value ?? <span className="cell-empty">—</span>}
                                                    </span>
                                                )}
                                                {cell?.corrected && <span className="corrected-badge">✓</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataGrid;
