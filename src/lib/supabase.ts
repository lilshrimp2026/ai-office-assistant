import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// 从环境变量获取配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 创建 Supabase 客户端
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// 辅助函数：获取当前用户
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// 辅助函数：检查用户是否登录
export const isAuthenticated = async () => {
  const user = await getCurrentUser()
  return !!user
}

// 辅助函数：获取用户订阅信息
export const getUserSubscription = async () => {
  const user = await getCurrentUser()
  
  if (!user) return null
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      subscription_plans (
        name,
        ai_quota_daily,
        storage_quota_mb
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()
  
  if (error) return null
  
  return data
}

// 辅助函数：获取用户今日配额使用情况
export const getTodayUsage = async () => {
  const user = await getCurrentUser()
  
  if (!user) return null
  
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('usage_quotas')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()
  
  if (error && error.code !== 'PGRST116') return null
  
  return data || { ai_requests: 0, storage_used_mb: 0 }
}

// 辅助函数：检查用户是否有足够配额
export const checkQuota = async (type: 'ai' | 'storage', required: number) => {
  const user = await getCurrentUser()
  
  if (!user) return { allowed: false, reason: '未登录' }
  
  // 获取订阅配额
  const subscription = await getUserSubscription()
  const usage = await getTodayUsage()
  
  if (!subscription) {
    // 使用免费计划
    const aiLimit = 100
    const storageLimit = 100
    
    if (type === 'ai') {
      const allowed = (usage?.ai_requests || 0) + required <= aiLimit
      return {
        allowed,
        reason: allowed ? undefined : 'AI 请求配额已用尽',
        used: usage?.ai_requests || 0,
        limit: aiLimit
      }
    } else {
      const allowed = (usage?.storage_used_mb || 0) + required <= storageLimit
      return {
        allowed,
        reason: allowed ? undefined : '存储空间不足',
        used: usage?.storage_used_mb || 0,
        limit: storageLimit
      }
    }
  }
  
  // 使用订阅配额
  const aiLimit = subscription.subscription_plans.ai_quota_daily
  const storageLimit = subscription.subscription_plans.storage_quota_mb
  
  if (type === 'ai') {
    const allowed = (usage?.ai_requests || 0) + required <= aiLimit
    return {
      allowed,
      reason: allowed ? undefined : 'AI 请求配额已用尽',
      used: usage?.ai_requests || 0,
      limit: aiLimit
    }
  } else {
    const allowed = (usage?.storage_used_mb || 0) + required <= storageLimit
    return {
      allowed,
      reason: allowed ? undefined : '存储空间不足',
      used: usage?.storage_used_mb || 0,
      limit: storageLimit
    }
  }
}

// 辅助函数：记录 AI 使用量
export const recordAiUsage = async (tokenCount: number) => {
  const user = await getCurrentUser()
  
  if (!user) return
  
  const today = new Date().toISOString().split('T')[0]
  
  // 使用 upsert 更新或创建今日配额记录
  const { error } = await supabase.rpc('increment_ai_usage', {
    user_uuid: user.id,
    tokens: tokenCount
  })
  
  if (error) {
    console.error('Failed to record AI usage:', error)
  }
}

export default supabase
