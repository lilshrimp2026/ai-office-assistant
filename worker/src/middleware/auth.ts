import { Context, MiddlewareHandler } from 'hono'
import { jwtVerify } from 'hono/jwt'

// Supabase JWT 验证
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      error: {
        code: 'AUTH_REQUIRED',
        message: '缺少认证信息'
      }
    }, 401)
  }
  
  const token = authHeader.substring(7) // 移除 "Bearer " 前缀
  
  try {
    // 验证 JWT token
    const payload = await jwtVerify(
      token,
      new TextEncoder().encode(c.env.SUPABASE_SERVICE_ROLE_KEY)
    )
    
    // 提取用户信息
    const userId = payload.sub
    const userRole = (payload as any).role || 'user'
    
    // 将用户信息存入 context
    c.set('userId', userId)
    c.set('userRole', userRole)
    
    await next()
  } catch (error) {
    console.error('Auth error:', error)
    
    return c.json({
      error: {
        code: 'AUTH_INVALID',
        message: '无效的认证信息'
      }
    }, 401)
  }
}

// 管理员权限检查
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const userRole = c.get('userRole')
  
  if (userRole !== 'admin') {
    return c.json({
      error: {
        code: 'FORBIDDEN',
        message: '需要管理员权限'
      }
    }, 403)
  }
  
  await next()
}

// 高级会员权限检查
export const requirePremium: MiddlewareHandler = async (c, next) => {
  const userRole = c.get('userRole')
  
  if (userRole !== 'admin' && userRole !== 'premium') {
    return c.json({
      error: {
        code: 'FORBIDDEN',
        message: '需要专业版订阅'
      }
    }, 403)
  }
  
  await next()
}

// 获取当前用户 ID
export const getCurrentUserId = (c: Context) => {
  return c.get('userId')
}

// 获取当前用户角色
export const getCurrentUserRole = (c: Context) => {
  return c.get('userRole')
}
