/**
 * 用户信息和登出组件
 * 显示在侧边栏底部
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { LogOut, User, Settings } from 'lucide-react';
import './UserProfile.css';

interface UserInfo {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    avatar?: string;
    role: string;
}

export const UserProfile: React.FC = () => {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // 从本地存储获取用户信息
        const localUserInfo = authAPI.getLocalUserInfo();
        if (localUserInfo) {
            setUserInfo(localUserInfo);
        } else {
            // 如果本地没有，尝试从服务器获取
            fetchUserInfo();
        }
    }, []);

    const fetchUserInfo = async () => {
        try {
            const data = await authAPI.getCurrentUser();
            setUserInfo(data);
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await authAPI.logout();
            // logout 方法会自动跳转到登录页
        } catch (error) {
            console.error('登出失败:', error);
            // 即使失败也清除本地数据并跳转
            localStorage.clear();
            navigate('/login');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSettings = () => {
        setShowMenu(false);
        navigate('/settings');
    };

    if (!userInfo) {
        return null;
    }

    return (
        <div className="user-profile">
            <div 
                className="user-profile-trigger"
                onClick={() => setShowMenu(!showMenu)}
            >
                <div className="user-avatar">
                    {userInfo.avatar ? (
                        <img src={userInfo.avatar} alt={userInfo.username} />
                    ) : (
                        <User size={20} />
                    )}
                </div>
                <div className="user-info">
                    <div className="user-name">{userInfo.full_name || userInfo.username}</div>
                    <div className="user-email">{userInfo.email}</div>
                </div>
            </div>

            {showMenu && (
                <div className="user-menu">
                    <button className="user-menu-item" onClick={handleSettings}>
                        <Settings size={16} />
                        <span>设置</span>
                    </button>
                    <button 
                        className="user-menu-item logout" 
                        onClick={handleLogout}
                        disabled={isLoading}
                    >
                        <LogOut size={16} />
                        <span>{isLoading ? '登出中...' : '登出'}</span>
                    </button>
                </div>
            )}

            {showMenu && (
                <div 
                    className="user-menu-overlay" 
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
};
