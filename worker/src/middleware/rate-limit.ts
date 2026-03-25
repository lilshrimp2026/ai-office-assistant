import { Context, MiddlewareHandler } from 'hono'

interface RateLimitOptions {
  limit: number // 请求次数限制
  windowMs: number // 时间窗口 (毫秒)
}

interface RateLimitData {
  count: number
  resetAt: number
}

// 简单的内存限流 (生产环境建议使用 KV 存储)
const rateLimitStore = new Map<string, RateLimitData>()

export const rateLimitMiddleware = (options: RateLimitOptions): MiddlewareHandler => {
  return async (c, next) => {
    const userId = c.get('userId') || c.req.header('CF-Connecting-IP') || 'anonymous'
    const key = `ratelimit:${userId}`
    const now = Date.now()
    
    // 获取当前限流数据
    let data = rateLimitStore.get(key)
    
    // 如果没有数据或已过期，创建新的
    if (!data || now > data.resetAt) {
      data = {
        count: 0,
        resetAt: now + options.windowMs
      }
    }
    
    // 增加计数
    data.count++
    
    // 检查是否超限
    if (data.count > options.limit) {
      const retryAfter = Math.ceil((data.resetAt - now) / 1000)
      
      c.header('X-RateLimit-Limit', options.limit.toString())
      c.header('X-RateLimit-Remaining', '0')
      c.header('X-RateLimit-Reset', data.resetAt.toString())
      c.header('Retry-After', retryAfter.toString())
      
      return c.json({
        error: {
          code: 'RATE_LIMITED',
          message: `请求过于频繁，请在${retryAfter}秒后重试`,
          retryAfter
        }
      }, 429)
    }
    
    // 保存数据
    rateLimitStore.set(key, data)
    
    // 设置响应头
    c.header('X-RateLimit-Limit', options.limit.toString())
    c.header('X-RateLimit-Remaining', (options.limit - data.count).toString())
    c.header('X-RateLimit-Reset', data.resetAt.toString())
    
    await next()
  }
}

// 清理过期的限流数据 (定期调用)
export const cleanupRateLimitStore = () => {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

// 每 5 分钟清理一次
setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
