# 安全政策

## 支持的版本

当前支持安全更新的版本：

| 版本 | 支持状态 |
| --- | --- |
| 2.0.x | ✅ 支持 |
| 1.x.x | ❌ 不支持 |

## 报告漏洞

如果您发现了安全漏洞，请**不要**公开提交 Issue。

### 报告流程

1. **发送邮件**至：security@bioagent.local
2. **包含以下信息**：
   - 漏洞描述
   - 重现步骤
   - 影响范围
   - 建议的修复方案（如果有）

3. **响应时间**：
   - 我们会在 48 小时内确认收到
   - 7 天内提供初步评估
   - 30 天内发布修复（视严重程度而定）

### 安全最佳实践

#### 部署前检查清单

- [ ] 修改所有默认密码
- [ ] 配置 CORS 允许的域名
- [ ] 启用 HTTPS
- [ ] 设置强随机的 SECRET_KEY
- [ ] 配置防火墙规则
- [ ] 启用数据库认证
- [ ] 定期备份数据
- [ ] 监控异常访问

#### 环境变量安全

```bash
# ❌ 错误：硬编码密钥
OPENAI_API_KEY=sk-1234567890

# ✅ 正确：使用密钥管理服务
OPENAI_API_KEY=$(aws secretsmanager get-secret-value --secret-id openai-key --query SecretString --output text)
```

#### API Key 管理

1. **永远不要**将 API Key 提交到 Git
2. 使用 `.env` 文件并确保在 `.gitignore` 中
3. 生产环境使用密钥管理服务（AWS Secrets Manager、HashiCorp Vault）
4. 定期轮换 API Key
5. 为不同环境使用不同的 Key

#### 数据库安全

```yaml
# ❌ 错误：无认证，暴露端口
mongo:
  ports:
    - "27017:27017"

# ✅ 正确：启用认证，仅本地访问
mongo:
  ports:
    - "127.0.0.1:27017:27017"
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
```

#### CORS 配置

```python
# ❌ 错误：允许所有来源
allow_origins=["*"]

# ✅ 正确：明确指定允许的域名
allow_origins=[
    "https://yourdomain.com",
    "https://app.yourdomain.com"
]
```

### 已知安全问题

#### 已修复

- **v2.0.0**: 修复 CORS 配置过于宽松的问题
- **v2.0.0**: 添加 API Key 加密存储
- **v2.0.0**: 修复 MongoDB 查询注入风险

#### 待修复

无

### 安全审计日志

| 日期 | 审计人 | 发现问题 | 状态 |
|------|--------|----------|------|
| 2026-02-01 | AI Reviewer | CORS 配置、数据库认证 | ✅ 已修复 |

### 依赖项安全

我们使用以下工具监控依赖项安全：

- **Python**: `pip-audit`, `safety`
- **Node.js**: `npm audit`
- **Docker**: Trivy

定期运行安全扫描：

```bash
# Python 依赖扫描
cd backend
pip-audit

# Node.js 依赖扫描
npm audit

# Docker 镜像扫描
trivy image bioagent-backend:latest
```

### 联系方式

- **安全邮箱**: security@bioagent.local
- **紧急联系**: +86-xxx-xxxx-xxxx
- **PGP 公钥**: [链接]

### 致谢

感谢以下安全研究人员的贡献：

- （待添加）

---

**最后更新**: 2026-02-01

