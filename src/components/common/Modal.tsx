import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    closeOnOverlayClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnOverlayClick = true,
}) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        full: 'max-w-[95vw] h-[90vh]',
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4 animate-fadeIn"
            onClick={handleOverlayClick}
        >
            {/* Backdrop with Blur */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />

            {/* Modal Panel */}
            <div
                className={`relative bg-surface rounded-xl w-full ${sizeClasses[size]} shadow-float flex flex-col max-h-[90vh] animate-slideUp overflow-hidden border border-slate-200`}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-subtle bg-bg-surface flex justify-between items-center shrink-0">
                    <div className="text-lg font-semibold text-text-primary">{title}</div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-border-subtle flex justify-end gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
