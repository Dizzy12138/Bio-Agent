/**
 * 前端API客户端工具
 * 包含认证拦截器和请求封装
 */

import axios from 'axios';

// 自动检测 API 地址
// 如果是通过外部 IP 访问，使用相同的 host；否则使用 localhost
const getApiBaseUrl = () => {
    // 优先使用环境变量
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }
    
    // 如果是通过外部 IP 访问（不是 localhost），使用相同的 origin
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // 使用当前访问的 host 和 port
        return `${window.location.protocol}//${window.location.host}/api/v1`;
    }
    
    // 默认使用 localhost
    return 'http://localhost:8001/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

console.log('API Base URL:', API_BASE_URL); // 调试信息

// 创建axios实例
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器 - 处理token过期
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Token过期，尝试刷新
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const { data } = await axios.post(
                        `${API_BASE_URL}/auth/refresh`,
                        { refresh_token: refreshToken }
                    );

                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);

                    // 重试原请求
                    originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // 刷新失败，清除token并跳转登录
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user_info');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            } else {
                // 没有refresh token，直接跳转登录
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

// ==================== 认证API ====================

export const authAPI = {
    /**
     * 用户注册
     */
    register: async (data: {
        username: string;
        email: string;
        password: string;
        full_name?: string;
    }) => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    /**
     * 用户登录
     */
    login: async (username: string, password: string) => {
        const response = await api.post('/auth/login', {
            username,
            password,
        });
        
        // 保存token和用户信息
        const { access_token, refresh_token } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        
        // 获取用户信息
        const userInfo = await authAPI.getCurrentUser();
        localStorage.setItem('user_info', JSON.stringify(userInfo));
        
        return response.data;
    },

    /**
     * 用户登出
     */
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_info');
            window.location.href = '/login';
        }
    },

    /**
     * 获取当前用户信息
     */
    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    /**
     * 更新当前用户信息
     */
    updateCurrentUser: async (data: {
        full_name?: string;
        avatar?: string;
        preferences?: Record<string, any>;
    }) => {
        const response = await api.put('/auth/me', data);
        localStorage.setItem('user_info', JSON.stringify(response.data));
        return response.data;
    },

    /**
     * 检查是否已登录
     */
    isAuthenticated: () => {
        return !!localStorage.getItem('access_token');
    },

    /**
     * 获取本地存储的用户信息
     */
    getLocalUserInfo: () => {
        const userInfo = localStorage.getItem('user_info');
        return userInfo ? JSON.parse(userInfo) : null;
    },
};

// ==================== 对话API ====================

export const chatAPI = {
    createConversation: (data: any) => api.post('/chat/conversations', data),
    getConversations: (params?: any) => api.get('/chat/conversations', { params }),
    getConversation: (id: string) => api.get(`/chat/conversations/${id}`),
    updateConversation: (id: string, data: any) => api.put(`/chat/conversations/${id}`, data),
    deleteConversation: (id: string) => api.delete(`/chat/conversations/${id}`),
    pinConversation: (id: string, isPinned: boolean) => 
        api.post(`/chat/conversations/${id}/pin`, null, { params: { is_pinned: isPinned } }),
    favoriteConversation: (id: string, isFavorite: boolean) => 
        api.post(`/chat/conversations/${id}/favorite`, null, { params: { is_favorite: isFavorite } }),
    archiveConversation: (id: string, isArchived: boolean) => 
        api.post(`/chat/conversations/${id}/archive`, null, { params: { is_archived: isArchived } }),
    searchConversations: (query: string) => 
        api.get('/chat/conversations/search', { params: { query } }),
    chatCompletion: (data: any) => api.post('/chat/completions', data),
};

// ==================== 技能API ====================

export const skillsAPI = {
    getAllSkills: (enabledOnly?: boolean) => 
        api.get('/skills', { params: { enabled_only: enabledOnly } }),
    getSkill: (id: string) => api.get(`/skills/${id}`),
    createSkill: (data: any) => api.post('/skills', data),
    updateSkill: (id: string, data: any) => api.put(`/skills/${id}`, data),
    deleteSkill: (id: string) => api.delete(`/skills/${id}`),
    toggleSkill: (id: string, enabled: boolean) => 
        api.post(`/skills/${id}/toggle`, null, { params: { enabled } }),
    executeSkill: (id: string, params: any) => api.post(`/skills/${id}/execute`, { params }),
};

// ==================== MCP API ====================

export const mcpAPI = {
    createServer: (data: any) => api.post('/mcp/servers', data),
    getServers: () => api.get('/mcp/servers'),
    getServer: (id: string) => api.get(`/mcp/servers/${id}`),
    updateServer: (id: string, data: any) => api.put(`/mcp/servers/${id}`, data),
    deleteServer: (id: string) => api.delete(`/mcp/servers/${id}`),
    toggleServer: (id: string, isEnabled: boolean) => 
        api.post(`/mcp/servers/${id}/toggle`, null, { params: { is_enabled: isEnabled } }),
    connectServer: (id: string) => api.post(`/mcp/servers/${id}/connect`),
    disconnectServer: (id: string) => api.post(`/mcp/servers/${id}/disconnect`),
    saveToolConfig: (data: any) => api.post('/mcp/tools', data),
    getAllToolConfigs: () => api.get('/mcp/tools'),
    getToolConfig: (id: string) => api.get(`/mcp/tools/${id}`),
    deleteToolConfig: (id: string) => api.delete(`/mcp/tools/${id}`),
};

// ==================== 演练场API ====================

export const playgroundAPI = {
    createSession: (data: any) => api.post('/playground/sessions', data),
    getSessions: (params?: any) => api.get('/playground/sessions', { params }),
    getSession: (id: string) => api.get(`/playground/sessions/${id}`),
    updateSession: (id: string, data: any) => api.put(`/playground/sessions/${id}`, data),
    deleteSession: (id: string) => api.delete(`/playground/sessions/${id}`),
    archiveSession: (id: string, isArchived: boolean) => 
        api.post(`/playground/sessions/${id}/archive`, null, { params: { is_archived: isArchived } }),
    uploadDocument: (id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/playground/sessions/${id}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    removeDocument: (sessionId: string, docId: string) => 
        api.delete(`/playground/sessions/${sessionId}/documents/${docId}`),
    addMessage: (id: string, message: any) => 
        api.post(`/playground/sessions/${id}/messages`, message),
    updateExtractedData: (id: string, data: any) => 
        api.put(`/playground/sessions/${id}/extracted-data`, data),
    extractData: (id: string) => api.post(`/playground/sessions/${id}/extract`),
};

export default api;
