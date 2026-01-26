/**
 * SchemaEditor Component
 * A visual editor for viewing and modifying extraction schema fields.
 */

import React, { useState } from 'react';
import { usePlaygroundStore, type SchemaField } from '../stores/playgroundStore';
import { Plus, Trash2, Edit2, Check, X, GripVertical } from 'lucide-react';
import './SchemaEditor.css';

const FIELD_TYPES = [
    { value: 'string', label: '文本' },
    { value: 'number', label: '数字' },
    { value: 'date', label: '日期' },
    { value: 'boolean', label: '布尔' },
] as const;

export const SchemaEditor: React.FC = () => {
    const { schema, setSchema, addSchemaField, removeSchemaField, schemaInferred } = usePlaygroundStore();

    const [isAdding, setIsAdding] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [newField, setNewField] = useState<SchemaField>({
        name: '',
        type: 'string',
        required: true,
        description: '',
    });

    const handleAddField = () => {
        if (!newField.name.trim()) return;
        addSchemaField({
            ...newField,
            name: newField.name.trim().toLowerCase().replace(/\s+/g, '_'),
        });
        setNewField({ name: '', type: 'string', required: true, description: '' });
        setIsAdding(false);
    };

    const handleUpdateField = (oldName: string, updated: Partial<SchemaField>) => {
        const field = schema.find((f) => f.name === oldName);
        if (!field) return;

        const newSchema = schema.map((f) =>
            f.name === oldName ? { ...f, ...updated } : f
        );
        setSchema(newSchema);
        setEditingField(null);
    };

    const handleDeleteField = (name: string) => {
        removeSchemaField(name);
    };

    return (
        <div className="schema-editor">
            <div className="schema-editor__header">
                <div className="header-title">
                    <h4>📋 Extraction Schema</h4>
                    {schemaInferred && (
                        <span className="ai-badge">AI Inferred</span>
                    )}
                </div>
                <button
                    className="btn-add"
                    onClick={() => setIsAdding(true)}
                    disabled={isAdding}
                >
                    <Plus size={14} />
                    Add Field
                </button>
            </div>

            <div className="schema-editor__fields">
                {schema.length === 0 && !isAdding ? (
                    <div className="empty-state">
                        <p>No fields defined</p>
                        <span>Use Agent chat or click "Add Field"</span>
                    </div>
                ) : (
                    <>
                        {schema.map((field) => (
                            <div
                                key={field.name}
                                className={`field-item ${editingField === field.name ? 'editing' : ''}`}
                            >
                                <div className="field-grip">
                                    <GripVertical size={14} />
                                </div>

                                {editingField === field.name ? (
                                    <div className="field-edit-form">
                                        <input
                                            type="text"
                                            value={field.name}
                                            onChange={(e) =>
                                                handleUpdateField(field.name, { name: e.target.value })
                                            }
                                            placeholder="Field name"
                                        />
                                        <select
                                            value={field.type}
                                            onChange={(e) =>
                                                handleUpdateField(field.name, {
                                                    type: e.target.value as SchemaField['type'],
                                                })
                                            }
                                        >
                                            {FIELD_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>
                                                    {t.label}
                                                </option>
                                            ))}
                                        </select>
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) =>
                                                    handleUpdateField(field.name, { required: e.target.checked })
                                                }
                                            />
                                            Required
                                        </label>
                                        <button
                                            className="btn-icon success"
                                            onClick={() => setEditingField(null)}
                                        >
                                            <Check size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="field-info">
                                            <span className="field-name">{field.name}</span>
                                            <span className="field-type">{field.type}</span>
                                            {field.required && (
                                                <span className="field-required">*</span>
                                            )}
                                        </div>
                                        {field.description && (
                                            <span className="field-desc">{field.description}</span>
                                        )}
                                        <div className="field-actions">
                                            <button
                                                className="btn-icon"
                                                onClick={() => setEditingField(field.name)}
                                                title="Edit field"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                className="btn-icon danger"
                                                onClick={() => handleDeleteField(field.name)}
                                                title="Delete field"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {isAdding && (
                            <div className="field-item adding">
                                <input
                                    type="text"
                                    value={newField.name}
                                    onChange={(e) =>
                                        setNewField({ ...newField, name: e.target.value })
                                    }
                                    placeholder="Field name (e.g., vendor)"
                                    autoFocus
                                />
                                <select
                                    value={newField.type}
                                    onChange={(e) =>
                                        setNewField({
                                            ...newField,
                                            type: e.target.value as SchemaField['type'],
                                        })
                                    }
                                >
                                    {FIELD_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={newField.required}
                                        onChange={(e) =>
                                            setNewField({ ...newField, required: e.target.checked })
                                        }
                                    />
                                    Required
                                </label>
                                <button className="btn-icon success" onClick={handleAddField}>
                                    <Check size={14} />
                                </button>
                                <button
                                    className="btn-icon danger"
                                    onClick={() => setIsAdding(false)}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SchemaEditor;
