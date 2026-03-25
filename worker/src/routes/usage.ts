import { Hono } from 'hono'
import { getCurrentUserId } from '../middleware/auth'
import { createClient } from '@supabase/supabase-js'

export const usageRouter = new Hono<{
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
// GET /api/usage/quota - 获取配额使用情况
// ===========================================

usageRouter.get('/quota', async (c) => {
  const userId = getCurrentUserId(c)
  
  try {
    const supabase = getSupabase(c)
    const today = new Date().toISOString().split('T')[0]
    
    // 获取用户订阅
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans (
          name,
          ai_quota_daily,
          storage_quota_mb
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
    
    // 获取今日使用量
    const { data: usage } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    
    // 获取存储使用量
    const { count: documentCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    const storageUsed = (usage?.storage_used_mb || 0) + ((documentCount || 0) * 0.1) // 估算
    
    // 默认免费计划
    let plan = 'free'
    let aiLimit = 100
    let storageLimit = 100
    let periodEnd = null
    
    if (subscription) {
      plan = subscription.subscription_plans.name
      aiLimit = subscription.subscription_plans.ai_quota_daily
      storageLimit = subscription.subscription_plans.storage_quota_mb
      periodEnd = subscription.current_period_end
    }
    
    return c.json({
      plan,
      aiRequests: {
        used: usage?.ai_requests || 0,
        limit: aiLimit,
        resetsAt: new Date(new Date().setDate(new Date().getDate() + 1)).setHours(0, 0, 0, 0).toISOString()
      },
      storage: {
        used: Math.round(storageUsed),
        limit: storageLimit,
        unit: 'MB'
      },
      periodEnd
    })
  } catch (error) {
    console.error('Get quota error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取配额信息失败'
      }
    }, 500)
  }
})

// ===========================================
// GET /api/usage/history - 使用历史
// ===========================================

usageRouter.get('/history', async (c) => {
  const userId = getCurrentUserId(c)
  const days = parseInt(c.req.query('days') || '7')
  
  try {
    const supabase = getSupabase(c)
    
    // 计算日期范围
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true })
    
    if (error) throw error
    
    return c.json({
      data: data || []
    })
  } catch (error) {
    console.error('Get history error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取使用历史失败'
      }
    }, 500)
  }
})
