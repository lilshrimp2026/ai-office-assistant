# AI 办公助手 - 0 成本启动项目

## 📋 项目简介

AI 办公助手是一个基于大模型的办公效率工具，提供：
- 📄 **文档总结** - 快速提取长文档核心内容
- 📊 **PPT 大纲** - 一键生成演示文稿大纲
- ✉️ **邮件生成** - 智能撰写商务邮件

## 🛠️ 技术栈

| 组件 | 技术选型 | 免费额度 |
|------|----------|---------|
| 前端框架 | Next.js 14 + React 18 | 开源免费 |
| UI 样式 | Tailwind CSS | 开源免费 |
| 前端部署 | Zeabur | 500 小时/月 |
| AI API | 智谱 AI（glm-4） | 新用户 100 万 tokens |
| 代码托管 | GitHub | 开源免费 |

## 📁 项目结构

```
ai-office-assistant/
├── src/
│   ├── app/              # Next.js 14 App Router
│   │   ├── layout.tsx    # 根布局
│   │   ├── page.tsx      # 首页
│   │   └── api/          # API 路由
│   ├── components/       # React 组件
│   ├── lib/              # 工具函数
│   └── styles/           # 样式文件
├── public/               # 静态资源
├── docs/                 # 文档
├── .env.example          # 环境变量模板
├── next.config.js        # Next.js 配置
├── tailwind.config.js    # Tailwind 配置
└── package.json          # 项目依赖
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd ai-office-assistant
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
# 智谱 AI API Key
ZHIPU_API_KEY=your_api_key_here

# GitHub 用户名
GITHUB_USERNAME=lilshrimp2026
```

### 3. 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 部署到 Zeabur

```bash
# 推送到 GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/lilshrimp2026/ai-office-assistant.git
git push -u origin main

# 在 Zeabur 控制台导入 GitHub 仓库
# https://zeabur.com/projects
```

## 📝 MVP 功能清单

### Phase 1 - 核心功能（本周）
- [ ] 首页 Landing Page
- [ ] 文档总结功能
- [ ] PPT 大纲生成
- [ ] 邮件生成

### Phase 2 - 增强功能（下周）
- [ ] 用户登录/注册
- [ ] 历史记录保存
- [ ] 导出功能（Markdown/PDF）

### Phase 3 - 商业化（后续）
- [ ] 会员订阅系统
- [ ] 支付集成（面包多/爱发电）
- [ ] 高级功能解锁

## 📄 License

MIT
