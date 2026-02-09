"""
初始化管理员账号脚本
"""
import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.auth_service import auth_service
from app.db.mongo import mongodb

async def init_admin():
    """初始化管理员账号"""
    try:
        # 连接数据库
        mongodb.connect()
        print("✓ 数据库连接成功")
        
        # 检查是否已存在 admin 用户
        admin = await auth_service.get_user_by_username("admin")
        
        if admin:
            print("✓ Admin 用户已存在")
            print(f"  用户名: {admin.username}")
            print(f"  邮箱: {admin.email}")
            print(f"  角色: {admin.role}")
            
            # 验证密码
            is_valid = auth_service.verify_password("admin123", admin.hashed_password)
            print(f"  密码验证: {'✓ 正确' if is_valid else '✗ 错误'}")
            
            if not is_valid:
                print("\n! 密码不正确，重新设置密码...")
                new_hash = auth_service.get_password_hash("admin123")
                await auth_service.collection().update_one(
                    {"username": "admin"},
                    {"$set": {"hashed_password": new_hash}}
                )
                print("✓ 密码已重置为: admin123")
        else:
            print("! Admin 用户不存在，正在创建...")
            await auth_service.init_default_admin()
            print("✓ Admin 用户创建成功")
            print("  用户名: admin")
            print("  密码: admin123")
        
        # 关闭数据库连接
        mongodb.close()
        print("\n✓ 初始化完成")
        
    except Exception as e:
        print(f"✗ 错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(init_admin())
