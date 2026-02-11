/**
 * 注册页面
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../utils/api';
import { Button, Input, useToast } from '../../components/common';
import { Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';
import './AuthPage.css';
import logoImg from '../../assets/logo.png';

export const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {
        if (!formData.username || !formData.email || !formData.password) {
            error('请填写所有必填项');
            return false;
        }

        if (formData.username.length < 3) {
            error('用户名至少需要3个字符');
            return false;
        }

        if (formData.password.length < 8) {
            error('密码至少需要8个字符');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            error('两次输入的密码不一致');
            return false;
        }

        // 简单的邮箱验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            error('请输入有效的邮箱地址');
            return false;
        }

        return true;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            await authAPI.register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                full_name: formData.fullName || undefined,
            });

            success('注册成功！正在跳转登录...');
            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            // Pydantic 422 validation error returns detail as array of objects
            const msg = Array.isArray(detail)
                ? detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join('; ')
                : (typeof detail === 'string' ? detail : '注册失败，请稍后重试');
            error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    {/* Logo和标题 */}
                    <div className="auth-header">
                        <img src={logoImg} alt="Logo" className="auth-logo" />
                        <h1 className="auth-title">创建账号</h1>
                        <p className="auth-subtitle">加入Bio-Agent智能平台</p>
                    </div>

                    {/* 注册表单 */}
                    <form onSubmit={handleRegister} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="username">
                                用户名 <span className="required">*</span>
                            </label>
                            <Input
                                id="username"
                                type="text"
                                value={formData.username}
                                onChange={(e) => handleChange('username', e.target.value)}
                                placeholder="至少3个字符"
                                autoComplete="username"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                邮箱 <span className="required">*</span>
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="your@email.com"
                                autoComplete="email"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="fullName">姓名（可选）</label>
                            <Input
                                id="fullName"
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => handleChange('fullName', e.target.value)}
                                placeholder="请输入您的姓名"
                                autoComplete="name"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">
                                密码 <span className="required">*</span>
                            </label>
                            <div className="password-input-wrapper">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    placeholder="至少8个字符"
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">
                                确认密码 <span className="required">*</span>
                            </label>
                            <div className="password-input-wrapper">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                    placeholder="再次输入密码"
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            fullWidth
                            disabled={loading}
                            leftIcon={<UserPlus size={18} />}
                        >
                            {loading ? '注册中...' : '注册'}
                        </Button>
                    </form>

                    {/* 底部链接 */}
                    <div className="auth-footer">
                        <button
                            className="auth-link"
                            onClick={() => navigate('/login')}
                            disabled={loading}
                        >
                            <ArrowLeft size={16} />
                            返回登录
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;

