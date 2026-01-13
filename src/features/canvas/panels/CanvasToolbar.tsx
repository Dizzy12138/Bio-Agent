import React, { useState } from 'react';
import { Save, Play, Undo, Redo, ZoomIn, ZoomOut, Maximize2, FolderOpen, Clock } from 'lucide-react';
import { Button } from '../../../components/common';
import { useWorkflowStore } from '../../../stores';
import { WorkflowManager, WorkflowSaveModal, ExecutionPanel } from '../../workflow';
import type { SavedWorkflow, WorkflowSaveData } from '../../workflow/types';
import './CanvasToolbar.css';

export const CanvasToolbar: React.FC = () => {
    const { workflowName, isDirty, execution, startExecution, clearExecution, setWorkflowMeta, setDirty } = useWorkflowStore();

    const [showManager, setShowManager] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showExecutionPanel, setShowExecutionPanel] = useState(false);

    const handleSave = () => {
        setShowSaveModal(true);
    };

    const handleConfirmSave = (data: WorkflowSaveData) => {
        console.log('Saving workflow:', data);
        setWorkflowMeta(
            `wf-${Date.now()}`,
            data.name,
            data.description
        );
        setDirty(false);
        setShowSaveModal(false);
    };

    const handleRun = () => {
        if (execution?.status === 'running') {
            clearExecution();
        } else {
            startExecution();
            setShowExecutionPanel(true);
        }
    };

    const handleLoadWorkflow = (workflow: SavedWorkflow) => {
        console.log('Loading workflow:', workflow);
        setWorkflowMeta(workflow.id, workflow.name, workflow.description);
        setShowManager(false);
    };

    return (
        <>
            <div className="canvas-toolbar">
                <div className="toolbar-left">
                    <button
                        className="toolbar-btn"
                        title="打开工作流管理"
                        onClick={() => setShowManager(true)}
                    >
                        <FolderOpen size={18} />
                    </button>
                    <h2 className="workflow-title">
                        {workflowName}
                        {isDirty && <span className="dirty-indicator">*</span>}
                    </h2>
                </div>

                <div className="toolbar-center">
                    <button className="toolbar-btn" title="撤销">
                        <Undo size={18} />
                    </button>
                    <button className="toolbar-btn" title="重做">
                        <Redo size={18} />
                    </button>
                    <div className="toolbar-divider" />
                    <button className="toolbar-btn" title="放大">
                        <ZoomIn size={18} />
                    </button>
                    <button className="toolbar-btn" title="缩小">
                        <ZoomOut size={18} />
                    </button>
                    <button className="toolbar-btn" title="适应画布">
                        <Maximize2 size={18} />
                    </button>
                </div>

                <div className="toolbar-right">
                    <button
                        className={`toolbar-btn ${showExecutionPanel ? 'active' : ''}`}
                        title="执行调试面板"
                        onClick={() => setShowExecutionPanel(!showExecutionPanel)}
                    >
                        <Clock size={18} />
                    </button>
                    <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Save size={16} />}
                        onClick={handleSave}
                    >
                        保存
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Play size={16} />}
                        onClick={handleRun}
                        isLoading={execution?.status === 'running'}
                    >
                        {execution?.status === 'running' ? '运行中' : '运行'}
                    </Button>
                </div>
            </div>

            {/* 工作流管理器 */}
            <WorkflowManager
                isOpen={showManager}
                onClose={() => setShowManager(false)}
                onLoadWorkflow={handleLoadWorkflow}
            />

            {/* 保存模态框 */}
            <WorkflowSaveModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={handleConfirmSave}
                initialData={{ name: workflowName }}
            />

            {/* 执行面板 */}
            <ExecutionPanel
                isOpen={showExecutionPanel}
                onClose={() => setShowExecutionPanel(false)}
            />
        </>
    );
};

