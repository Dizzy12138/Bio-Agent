/**
 * 用户管理面板
 * 管理系统用户、权限和配额
 */

import React, { useState, useEffect } from 'react';
import { Button, useToast, Modal } from '../../../components/common';
import { Users, Plus, Edit2, Trash2, Shield, Mail, Calendar, Search } from 'lucide-react';
import api from '../../../utils/api';
import './UserManagement.css';

interface User {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    role: 'admin' | 'user' | 'guest';
    is_active: boolean;
    created_at: string;
    last_login?: string;
}

interface UserFormData {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    role: 'admin' | 'user' | 'guest';
}

export const UserManagement: React.FC = () => {
    const { success, error } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'user'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (e: any) {
            console.error('获取用户列表失败:', e);
            error(e.response?.data?.detail || '获取用户列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!formData.username || !formData.email || !formData.password) {
            error('请填写必填字段');
            return;
        }

        try {
            await api.post('/users', formData);
                success('用户创建成功');
                setShowAddModal(false);
                resetForm();
                fetchUsers();
        } catch (e: any) {
            error(e.response?.data?.detail || '创建失败');
        }
    };

    const handleUpdate = async () => {
        if (!editingUser) return;

        try {
            await api.put(`/users/${editingUser.id}`, {
                    full_name: formData.full_name,
                    role: formData.role,
                    is_active: editingUser.is_active
            });
                success('用户更新成功');
                setEditingUser(null);
                resetForm();
                fetchUsers();
        } catch (e: any) {
            error(e.response?.data?.detail || '更新失败');
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('确定删除该用户吗？此操作不可恢复。')) return;

        try {
            await api.delete(`/users/${userId}`);
                success('用户删除成功');
                fetchUsers();
        } catch (e: any) {
            error(e.response?.data?.detail || '删除失败');
        }
    };

    const handleToggleActive = async (userId: string, isActive: boolean) => {
        try {
            await api.post(`/users/${userId}/toggle`, null, {
                params: { is_active: !isActive }
            });
                success(isActive ? '用户已禁用' : '用户已启用');
                fetchUsers();
        } catch (e: any) {
            error(e.response?.data?.detail || '操作失败');
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            email: '',
            password: '',
            full_name: '',
            role: 'user'
        });
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: '',
            full_name: user.full_name || '',
            role: user.role
        });
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getRoleBadge = (role: string) => {
        const styles = {
            admin: 'bg-red-50 text-red-700 border-red-200',
            user: 'bg-blue-50 text-blue-700 border-blue-200',
            guest: 'bg-gray-50 text-gray-700 border-gray-200'
        };
        const labels = {
            admin: '管理员',
            user: '用户',
            guest: '访客'
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[role as keyof typeof styles]}`}>
                {labels[role as keyof typeof labels]}
            </span>
        );
    };

    return (
        <div className="user-management">
            {/* 头部 */}
            <div className="user-management-header">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="搜索用户..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button onClick={() => setShowAddModal(true)} leftIcon={<Plus size={16} />}>
                    添加用户
                </Button>
            </div>

            {/* 用户列表 */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>加载中...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="empty-state">
                    <Users size={48} />
                    <h3>暂无用户</h3>
                    <p>点击"添加用户"创建新用户</p>
                </div>
            ) : (
                <div className="users-grid">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="user-card">
                            <div className="user-card-header">
                                <div className="user-avatar">
                                    {user.full_name ? user.full_name[0].toUpperCase() : user.username[0].toUpperCase()}
                                </div>
                                <div className="user-info">
                                    <h3>{user.full_name || user.username}</h3>
                                    <p className="user-username">@{user.username}</p>
                                </div>
                                <div className="user-actions">
                                    <button
                                        onClick={() => openEditModal(user)}
                                        className="action-btn"
                                        title="编辑"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="action-btn danger"
                                        title="删除"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="user-card-body">
                                <div className="user-detail">
                                    <Mail size={14} />
                                    <span>{user.email}</span>
                                </div>
                                <div className="user-detail">
                                    <Shield size={14} />
                                    {getRoleBadge(user.role)}
                                </div>
                                <div className="user-detail">
                                    <Calendar size={14} />
                                    <span>创建于 {new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
                                {user.last_login && (
                                    <div className="user-detail">
                                        <span className="text-xs text-gray-500">
                                            最后登录: {new Date(user.last_login).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="user-card-footer">
                                <button
                                    onClick={() => handleToggleActive(user.id, user.is_active)}
                                    className={`status-toggle ${user.is_active ? 'active' : 'inactive'}`}
                                >
                                    {user.is_active ? '✓ 已启用' : '✗ 已禁用'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 添加/编辑用户模态框 */}
            <Modal
                isOpen={showAddModal || editingUser !== null}
                onClose={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                    resetForm();
                }}
                title={editingUser ? '编辑用户' : '添加用户'}
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowAddModal(false);
                                setEditingUser(null);
                                resetForm();
                            }}
                        >
                            取消
                        </Button>
                        <Button onClick={editingUser ? handleUpdate : handleAdd}>
                            {editingUser ? '保存' : '创建'}
                        </Button>
                    </>
                }
            >
                <div className="user-form">
                    <div className="form-group">
                        <label>用户名 *</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            disabled={!!editingUser}
                            placeholder="输入用户名"
                        />
                    </div>

                    <div className="form-group">
                        <label>邮箱 *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={!!editingUser}
                            placeholder="输入邮箱"
                        />
                    </div>

                    {!editingUser && (
                        <div className="form-group">
                            <label>密码 *</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="输入密码"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>姓名</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="输入姓名（可选）"
                        />
                    </div>

                    <div className="form-group">
                        <label>角色 *</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        >
                            <option value="user">用户</option>
                            <option value="admin">管理员</option>
                            <option value="guest">访客</option>
                        </select>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
