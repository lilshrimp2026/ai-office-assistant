import { Hono } from 'hono'
import { getCurrentUserId } from '../middleware/auth'
import { createClient } from '@supabase/supabase-js'

export const conversationsRouter = new Hono<{
  Bindings: {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
  }
  Variables: {
    userId: string
  }
}>()

// 获取 Supabase 客户端
const getSupabase = (c: any) => {
  return createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ===========================================
// GET /api/conversations - 获取对话列表
// ===========================================

conversationsRouter.get('/', async (c) => {
  const userId = getCurrentUserId(c)
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const archived = c.req.query('archived') === 'true'
  
  try {
    const supabase = getSupabase(c)
    
    let query = supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (!archived) {
      query = query.eq('is_archived', false)
    }
    
    // 分页
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
    
    const { data, error, count } = await query
    
    if (error) throw error
    
    // 获取每个对话的消息数量
    const conversations = await Promise.all(
      (data || []).map(async (conv) => {
        const { count: messageCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
        
        return {
          ...conv,
          messageCount: messageCount || 0
        }
      })
    )
    
    return c.json({
      data: conversations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Get conversations error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取对话列表失败'
      }
    }, 500)
  }
})

// ===========================================
// POST /api/conversations - 创建对话
// ===========================================

conversationsRouter.post('/', async (c) => {
  const userId = getCurrentUserId(c)
  const body = await c.req.json()
  
  const { title = '新对话', modelPreference = 'groq' } = body
  
  try {
    const supabase = getSupabase(c)
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title,
        model_used: modelPreference
      })
      .select()
      .single()
    
    if (error) throw error
    
    return c.json(data, 201)
  } catch (error) {
    console.error('Create conversation error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '创建对话失败'
      }
    }, 500)
  }
})

// ===========================================
// GET /api/conversations/:id - 获取对话详情
// ===========================================

conversationsRouter.get('/:id', async (c) => {
  const userId = getCurrentUserId(c)
  const conversationId = c.req.param('id')
  
  try {
    const supabase = getSupabase(c)
    
    // 获取对话
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()
    
    if (convError || !conversation) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: '对话不存在'
        }
      }, 404)
    }
    
    // 获取消息
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    if (msgError) throw msgError
    
    return c.json({
      ...conversation,
      messages: messages || []
    })
  } catch (error) {
    console.error('Get conversation error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取对话详情失败'
      }
    }, 500)
  }
})

// ===========================================
// POST /api/conversations/:id/messages - 发送消息
// ===========================================

conversationsRouter.post('/:id/messages', async (c) => {
  const userId = getCurrentUserId(c)
  const conversationId = c.req.param('id')
  const body = await c.req.json()
  
  const { content, attachments = [] } = body
  
  if (!content) {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'content 是必填字段'
      }
    }, 400)
  }
  
  try {
    const supabase = getSupabase(c)
    
    // 验证对话归属
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()
    
    if (convError || !conversation) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: '对话不存在'
        }
      }, 404)
    }
    
    // 插入用户消息
    const { data: userMessage, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content,
        metadata: { attachments }
      })
      .select()
      .single()
    
    if (msgError) throw msgError
    
    // TODO: 调用 AI 服务生成回复
    // 这里简化处理，实际应该调用 AI 路由
    const aiResponse = {
      content: '这是 AI 回复 (需要集成 AI 服务)',
      tokenCount: 100
    }
    
    // 插入 AI 回复
    const { data: assistantMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse.content,
        token_count: aiResponse.tokenCount
      })
      .select()
      .single()
    
    // 更新对话
    await supabase
      .from('conversations')
      .update({
        token_count: conversation.token_count + aiResponse.tokenCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
    
    return c.json({
      message: userMessage,
      response: assistantMessage,
      usage: {
        aiRequestsToday: 1, // TODO: 从配额表获取
        aiRequestsLimit: 100
      }
    }, 201)
  } catch (error) {
    console.error('Send message error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '发送消息失败'
      }
    }, 500)
  }
})

// ===========================================
// PUT /api/conversations/:id - 更新对话
// ===========================================

conversationsRouter.put('/:id', async (c) => {
  const userId = getCurrentUserId(c)
  const conversationId = c.req.param('id')
  const body = await c.req.json()
  
  const { title, isArchived } = body
  
  try {
    const supabase = getSupabase(c)
    
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (isArchived !== undefined) updateData.is_archived = isArchived
    
    const { data, error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) throw error
    
    return c.json(data)
  } catch (error) {
    console.error('Update conversation error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '更新对话失败'
      }
    }, 500)
  }
})

// ===========================================
// DELETE /api/conversations/:id - 删除对话
// ===========================================

conversationsRouter.delete('/:id', async (c) => {
  const userId = getCurrentUserId(c)
  const conversationId = c.req.param('id')
  
  try {
    const supabase = getSupabase(c)
    
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId)
    
    if (error) throw error
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '删除对话失败'
      }
    }, 500)
  }
})
