import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove
        setTimeout(() => removeToast(id), 3000);
    }, [removeToast]);

    const success = (msg: string) => showToast(msg, 'success');
    const error = (msg: string) => showToast(msg, 'error');
    const info = (msg: string) => showToast(msg, 'info');

    return (
        <ToastContext.Provider value={{ showToast, success, error, info }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type} slide-in`}>
                        <div className="toast-icon">
                            {toast.type === 'success' && <CheckCircle size={18} />}
                            {toast.type === 'error' && <AlertCircle size={18} />}
                            {toast.type === 'info' && <Info size={18} />}
                        </div>
                        <span className="toast-message">{toast.message}</span>
                        <button className="toast-close" onClick={() => removeToast(toast.id)}>
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
