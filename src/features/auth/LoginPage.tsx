/**
 * 登录页面
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../utils/api';
import { Button, Input, useToast } from '../../components/common';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import './AuthPage.css';
import logoImg from '../../assets/logo.png';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username || !password) {
            error('请输入用户名和密码');
            return;
        }

        setLoading(true);
        try {
            await authAPI.login(username, password);
            success('登录成功！');
            // 登录成功后，使用 window.location.href 强制刷新页面
            window.location.href = '/experts';
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            const msg = Array.isArray(detail)
                ? detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join('; ')
                : (typeof detail === 'string' ? detail : '登录失败，请检查用户名和密码');
            error(msg);
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
                        <h1 className="auth-title">Bio-Agent</h1>
                        <p className="auth-subtitle">材料合成生物学智能平台</p>
                    </div>

                    {/* 登录表单 */}
                    <form onSubmit={handleLogin} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="username">用户名</label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="请输入用户名"
                                autoComplete="username"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">密码</label>
                            <div className="password-input-wrapper">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="请输入密码"
                                    autoComplete="current-password"
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

                        <Button
                            type="submit"
                            fullWidth
                            disabled={loading}
                            leftIcon={<LogIn size={18} />}
                        >
                            {loading ? '登录中...' : '登录'}
                        </Button>
                    </form>

                    {/* 底部链接 */}
                    <div className="auth-footer">
                        <span className="auth-footer-text">还没有账号？</span>
                        <button
                            className="auth-link"
                            onClick={() => navigate('/register')}
                            disabled={loading}
                        >
                            立即注册
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
