import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { conversationsRouter } from './routes/conversations'
import { documentsRouter } from './routes/documents'
import { aiRouter } from './routes/ai'
import { usageRouter } from './routes/usage'
import { subscriptionsRouter } from './routes/subscriptions'
import { keysRouter } from './routes/keys'

// 创建 Hono 应用
const app = new Hono<{
  Bindings: {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
    GROQ_API_KEY: string
    GOOGLE_GENERATIVE_AI_API_KEY: string
    R2_BUCKET: R2Bucket
    ENVIRONMENT: string
  }
  Variables: {
    userId: string
    userRole: string
  }
}>()

// ===========================================
// 全局中间件
// ===========================================

// 日志
app.use('*', logger())

// CORS 配置
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Request-Id'],
  credentials: true,
  maxAge: 86400,
}))

// 安全头
app.use('*', secureHeaders())

// ===========================================
// 健康检查
// ===========================================

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development'
  })
})

// ===========================================
// 公开路由 (无需认证)
// ===========================================

// 订阅计划列表
app.route('/api/subscriptions/plans', subscriptionsRouter)

// ===========================================
// 需要认证的路由
// ===========================================

app.use('/api/*', authMiddleware)
app.use('/api/*', rateLimitMiddleware({ limit: 100, windowMs: 3600000 }))

// 对话相关
app.route('/api/conversations', conversationsRouter)

// 文档相关
app.route('/api/documents', documentsRouter)

// AI 相关
app.route('/api/ai', aiRouter)

// 使用配额
app.route('/api/usage', usageRouter)

// API 密钥
app.route('/api/keys', keysRouter)

// 订阅管理 (需要认证)
app.route('/api/subscriptions', subscriptionsRouter)

// ===========================================
// 错误处理
// ===========================================

app.onError((err, c) => {
  console.error('Error:', err)
  
  return c.json({
    error: {
      code: err.name || 'INTERNAL_ERROR',
      message: err.message || '服务器内部错误',
      details: c.env.ENVIRONMENT === 'development' ? err.stack : undefined
    }
  }, err.status || 500)
})

// 404 处理
app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: '接口不存在'
    }
  }, 404)
})

// ===========================================
// 导出
// ===========================================

export default app
