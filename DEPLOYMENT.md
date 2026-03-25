# 部署指南

## 前置准备

### 1. 注册账号

- [Vercel](https://vercel.com/signup)
- [Cloudflare](https://dash.cloudflare.com/sign-up)
- [Supabase](https://supabase.com/start)
- [Groq](https://console.groq.com/login)
- [Google AI Studio](https://makersuite.google.com/app/apikey)

### 2. 创建 Supabase 项目

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref YOUR_PROJECT_REF

# 推送 schema
supabase db push
```

### 3. 配置环境变量

在 Vercel 项目设置中添加:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com
```

在 Cloudflare Workers 设置中添加:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
GROQ_API_KEY=gsk_xxx...
GOOGLE_GENERATIVE_AI_API_KEY=xxx...
```

## 部署步骤

### Step 1: 部署 Cloudflare Workers

```bash
cd worker

# 登录 Cloudflare
npx wrangler login

# 创建 R2 Bucket
npx wrangler r2 bucket create ai-office-files

# 测试本地运行
npx wrangler dev

# 部署到生产环境
npm run deploy
```

部署成功后，记录 Worker URL: `https://ai-office-api-prod.xxx.workers.dev`

### Step 2: 配置自定义域名 (可选)

```bash
# 在 Cloudflare 添加域名
# DNS 记录：CNAME api.your-domain.com -> ai-office-api-prod.xxx.workers.dev

# 更新 wrangler.toml
[env.production]
routes = ["api.your-domain.com/*"]
```

### Step 3: 部署 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 预览部署
vercel

# 生产部署
vercel --prod
```

### Step 4: 配置生产 API URL

在 Vercel 项目设置中更新:

```
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com
```

重新部署:

```bash
vercel --prod
```

## 验证部署

### 健康检查

```bash
curl https://api.your-domain.com/health
```

预期响应:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

### 测试 API

```bash
# 注册
curl -X POST https://api.your-domain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","fullName":"测试"}'

# 获取订阅计划
curl https://api.your-domain.com/api/subscriptions/plans
```

## 监控与日志

### Cloudflare Workers 日志

```bash
# 实时查看日志
npx wrangler tail --env production
```

### Vercel 日志

访问 Vercel Dashboard → 项目 → Logs

### Supabase 日志

访问 Supabase Dashboard → Database → Logs

## 故障排查

### 问题：API 返回 401

**原因**: JWT 验证失败

**解决**:
1. 检查 `SUPABASE_SERVICE_ROLE_KEY` 是否正确
2. 确认 Supabase 项目状态正常

### 问题：R2 上传失败

**原因**: Bucket 权限配置错误

**解决**:
1. 在 Cloudflare Dashboard 检查 R2 Bucket 权限
2. 确认 API Token 有 R2 访问权限

### 问题：AI 请求超时

**原因**: Groq/Gemini API 限流

**解决**:
1. 检查 API Key 配额
2. 增加重试逻辑
3. 考虑降级到备用模型

## 成本监控

### 设置告警

1. **Vercel**: Dashboard → Usage → Set Alert
2. **Cloudflare**: Dashboard → Workers → Usage → Set Alert
3. **Supabase**: Dashboard → Settings → Usage → Set Alert

### 预估成本

| 用户规模 | Vercel | Cloudflare | Supabase | AI | 总计 |
|---------|--------|-----------|----------|-----|------|
| 100 DAU | $0 | $0 | $0 | $0 | $0 |
| 500 DAU | $0 | $0 | $0 | $0 | $0 |
| 1000 DAU | $0 | $5 | $25 | $10 | $40 |
| 5000 DAU | $20 | $25 | $25 | $50 | $120 |

## 备份策略

### 数据库备份

Supabase 自动备份 (Pro 计划)，免费版建议定期导出:

```bash
supabase db dump -f backup-$(date +%Y%m%d).sql
```

### 配置文件备份

```bash
# 备份环境变量
cp .env.local .env.local.backup

# 备份 wrangler 配置
cp worker/wrangler.toml worker/wrangler.toml.backup
```

## 下一步

- [ ] 配置自定义域名
- [ ] 设置 HTTPS
- [ ] 配置 CDN 缓存
- [ ] 添加监控告警
- [ ] 设置自动备份
- [ ] 集成 Stripe 支付
- [ ] 配置邮件通知

---

**最后更新**: 2024-01-01
