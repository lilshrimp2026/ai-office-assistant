import { Hono } from 'hono'
import { getCurrentUserId } from '../middleware/auth'
import { createClient } from '@supabase/supabase-js'

export const subscriptionsRouter = new Hono<{
  Bindings: {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
    STRIPE_SECRET_KEY: string
    STRIPE_WEBHOOK_SECRET: string
    NEXT_PUBLIC_APP_URL: string
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
// GET /api/subscriptions/plans - 获取订阅计划 (公开)
// ===========================================

subscriptionsRouter.get('/plans', async (c) => {
  try {
    const supabase = getSupabase(c)
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
    
    if (error) throw error
    
    return c.json({
      plans: (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        displayName: getDisplayName(plan.name),
        priceMonthly: plan.price_monthly,
        priceYearly: plan.price_yearly,
        features: plan.features as string[],
        aiQuotaDaily: plan.ai_quota_daily,
        storageQuotaMb: plan.storage_quota_mb,
        isPopular: plan.name === 'pro'
      }))
    })
  } catch (error) {
    console.error('Get plans error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取订阅计划失败'
      }
    }, 500)
  }
})

// ===========================================
// GET /api/subscriptions/current - 获取当前订阅 (需要认证)
// ===========================================

subscriptionsRouter.get('/current', async (c) => {
  const userId = getCurrentUserId(c)
  
  try {
    const supabase = getSupabase(c)
    
    const { data: subscription, error } = await supabase
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
    
    if (error && error.code !== 'PGRST116') throw error
    
    if (!subscription) {
      return c.json({
        plan: {
          id: null,
          name: 'free',
          displayName: '免费计划'
        },
        status: 'none',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      })
    }
    
    return c.json({
      plan: {
        id: subscription.plan_id,
        name: subscription.subscription_plans.name,
        displayName: getDisplayName(subscription.subscription_plans.name)
      },
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取订阅信息失败'
      }
    }, 500)
  }
})

// ===========================================
// POST /api/subscriptions/checkout - 创建结账会话 (需要认证)
// ===========================================

subscriptionsRouter.post('/checkout', async (c) => {
  const userId = getCurrentUserId(c)
  const body = await c.req.json()
  
  const { planId, billingCycle = 'monthly' } = body
  
  if (!planId) {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'planId 是必填字段'
      }
    }, 400)
  }
  
  try {
    const supabase = getSupabase(c)
    
    // TODO: 集成 Stripe
    // 这里返回模拟数据
    
    // 获取计划信息
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()
    
    if (!plan) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: '订阅计划不存在'
        }
      }, 404)
    }
    
    // 模拟 Stripe Checkout Session
    const checkoutUrl = `https://checkout.stripe.com/mock/${planId}/${billingCycle}`
    
    return c.json({
      checkoutUrl,
      sessionId: `cs_mock_${crypto.randomUUID()}`,
      plan: {
        name: plan.name,
        price: billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly,
        billingCycle
      }
    })
  } catch (error) {
    console.error('Create checkout error:', error)
    
    return c.json({
      error: {
        code: 'CHECKOUT_ERROR',
        message: '创建结账会话失败'
      }
    }, 500)
  }
})

// ===========================================
// POST /api/subscriptions/cancel - 取消订阅 (需要认证)
// ===========================================

subscriptionsRouter.post('/cancel', async (c) => {
  const userId = getCurrentUserId(c)
  
  try {
    const supabase = getSupabase(c)
    
    // TODO: 调用 Stripe API 取消订阅
    
    // 更新数据库
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single()
    
    if (error) throw error
    
    return c.json({
      success: true,
      accessUntil: data.current_period_end,
      message: '订阅已取消，您将继续使用到当前周期结束'
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    
    return c.json({
      error: {
        code: 'CANCEL_ERROR',
        message: '取消订阅失败'
      }
    }, 500)
  }
})

// ===========================================
// POST /api/subscriptions/webhook - Stripe Webhook
// ===========================================

subscriptionsRouter.post('/webhook', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('Stripe-Signature')
  
  // TODO: 验证 Stripe 签名
  // const event = stripe.webhooks.constructEvent(body, signature!, webhookSecret)
  
  // 处理不同事件
  // - checkout.session.completed
  // - customer.subscription.updated
  // - customer.subscription.deleted
  // - invoice.payment_succeeded
  // - invoice.payment_failed
  
  return c.json({ received: true })
})

// ===========================================
// 辅助函数
// ===========================================

function getDisplayName(planName: string): string {
  const names: Record<string, string> = {
    free: '免费计划',
    pro: '专业计划',
    enterprise: '企业计划'
  }
  return names[planName] || planName
}
