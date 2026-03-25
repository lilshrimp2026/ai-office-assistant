import { Hono } from 'hono'
import { getCurrentUserId } from '../middleware/auth'
import { createClient } from '@supabase/supabase-js'

export const keysRouter = new Hono<{
  Bindings: {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
  }
  Variables: {
    userId: string
  }
}>()

const getSupabase = (c: any) => {
  return createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ===========================================
// GET /api/keys - 获取 API 密钥列表
// ===========================================

keysRouter.get('/', async (c) => {
  const userId = getCurrentUserId(c)
  
  try {
    const supabase = getSupabase(c)
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return c.json({
      keys: (data || []).map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.key_prefix,
        permissions: key.permissions,
        lastUsedAt: key.last_used_at,
        isActive: key.is_active,
        createdAt: key.created_at,
        expiresAt: key.expires_at
      }))
    })
  } catch (error) {
    console.error('Get keys error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取 API 密钥失败'
      }
    }, 500)
  }
})

// ===========================================
// POST /api/keys - 创建 API 密钥
// ===========================================

keysRouter.post('/', async (c) => {
  const userId = getCurrentUserId(c)
  const body = await c.req.json()
  
  const { name, permissions = ['read', 'write'], expiresIn = 365 } = body
  
  if (!name) {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'name 是必填字段'
      }
    }, 400)
  }
  
  try {
    const supabase = getSupabase(c)
    
    // 生成密钥
    const secretKey = `sk_${crypto.randomUUID().replace(/-/g, '')}`
    const keyPrefix = secretKey.substring(0, 12)
    
    // 哈希密钥 (使用简单的 SHA-256，生产环境应使用更安全的方案)
    const encoder = new TextEncoder()
    const data = encoder.encode(secretKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // 计算过期时间
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString()
      : null
    
    // 存储密钥
    const { data: key, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions,
        expires_at: expiresAt
      })
      .select()
      .single()
    
    if (error) throw error
    
    // 返回密钥 (只显示一次!)
    return c.json({
      key: {
        id: key.id,
        name: key.name,
        keyPrefix: key.key_prefix,
        permissions: key.permissions,
        createdAt: key.created_at,
        expiresAt: key.expires_at
      },
      secretKey,
      warning: '请妥善保存此密钥，它只会显示一次!'
    }, 201)
  } catch (error) {
    console.error('Create key error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '创建 API 密钥失败'
      }
    }, 500)
  }
})

// ===========================================
// DELETE /api/keys/:id - 撤销 API 密钥
// ===========================================

keysRouter.delete('/:id', async (c) => {
  const userId = getCurrentUserId(c)
  const keyId = c.req.param('id')
  
  try {
    const supabase = getSupabase(c)
    
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId)
    
    if (error) throw error
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete key error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '撤销 API 密钥失败'
      }
    }, 500)
  }
})
