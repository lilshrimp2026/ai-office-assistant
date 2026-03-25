# 🚀 AI 办公助手 - 部署脚本

## 前提条件
- 已安装 Node.js 和 Git
- 已配置 GitHub 认证

## 步骤 1：推送到 GitHub

### 方式 A：使用 SSH（推荐）

```bash
cd /path/to/ai-office-assistant

# 配置 Git 用户信息（如果是第一次）
git config --global user.email "lilshrimp2026@users.noreply.github.com"
git config --global user.name "lilshrimp2026"

# 添加 SSH 密钥到 GitHub
# 1. 生成密钥（如果没有）
ssh-keygen -t ed25519 -C "lilshrimp2026@users.noreply.github.com"
# 2. 复制公钥
cat ~/.ssh/id_ed25519.pub
# 3. 在 GitHub 添加：https://github.com/settings/keys

# 推送代码
git remote add origin git@github.com:lilshrimp2026/ai-office-assistant.git
git branch -M main
git push -u origin main
```

### 方式 B：使用 HTTPS + Token

```bash
cd /path/to/ai-office-assistant

# 创建 Personal Access Token
# 1. 访问：https://github.com/settings/tokens
# 2. 生成新 token（勾选 repo 权限）
# 3. 复制 token

# 推送代码
git remote add origin https://github.com/lilshrimp2026/ai-office-assistant.git
git branch -M main
git push -u origin main
# 输入 GitHub 用户名和 token
```

## 步骤 2：部署到 Zeabur

### 方法 1：通过 Zeabur 控制台（推荐）

1. 访问 https://zeabur.com/projects
2. 点击「Create New Project」
3. 选择「Deploy from GitHub」
4. 选择 `ai-office-assistant` 仓库
5. 添加环境变量：
   ```
   ZHIPU_API_KEY=ceb789a6447741fbb1a4d3afa353b496.rHTK6ofHbMA6YNCi
   ```
6. 点击「Deploy」

### 方法 2：使用 Zeabur CLI

```bash
# 安装 Zeabur CLI
npm install -g zeabur

# 登录
zeabur login

# 部署
cd ai-office-assistant
zeabur init
zeabur deploy
```

## 步骤 3：验证部署

部署完成后，访问 Zeabur 提供的域名测试功能。

---

## ⚠️ 重要提醒

1. **不要提交 .env 文件** - 已配置在 .gitignore 中
2. **API Key 保密** - 只在 Zeabur 环境变量中配置
3. **定期检查使用量** - 智谱 AI 和 Zeabur 都有免费额度限制

## 📊 免费额度参考

| 服务 | 免费额度 | 用途 |
|------|---------|------|
| 智谱 AI | 100 万 tokens | 约 5000 次请求 |
| Zeabur | 500 小时/月 | 24/7 运行约 20 天 |
| GitHub | 无限 | 代码托管 |

---

## 🆘 遇到问题？

1. SSH 连接失败 → 使用 HTTPS + Token 方式
2. 部署失败 → 检查 Zeabur 日志
3. API 错误 → 验证 API Key 是否正确
