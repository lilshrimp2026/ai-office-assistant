import { Hono } from 'hono'
import { getCurrentUserId } from '../middleware/auth'
import { createClient } from '@supabase/supabase-js'

export const documentsRouter = new Hono<{
  Bindings: {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
    R2_BUCKET: R2Bucket
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
// GET /api/documents - 获取文档列表
// ===========================================

documentsRouter.get('/', async (c) => {
  const userId = getCurrentUserId(c)
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const tag = c.req.query('tag')
  const search = c.req.query('search')
  
  try {
    const supabase = getSupabase(c)
    
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }
    
    // 分页
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
    
    const { data, error, count } = await query
    
    if (error) throw error
    
    // 获取标签
    const documents = await Promise.all(
      (data || []).map(async (doc) => {
        const { data: tags } = await supabase
          .from('document_tags')
          .select('tag')
          .eq('document_id', doc.id)
        
        return {
          ...doc,
          tags: tags?.map(t => t.tag) || []
        }
      })
    )
    
    return c.json({
      data: documents,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Get documents error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取文档列表失败'
      }
    }, 500)
  }
})

// ===========================================
// POST /api/documents - 创建文档
// ===========================================

documentsRouter.post('/', async (c) => {
  const userId = getCurrentUserId(c)
  const body = await c.req.json()
  
  const { title, content, tags = [] } = body
  
  if (!title) {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'title 是必填字段'
      }
    }, 400)
  }
  
  try {
    const supabase = getSupabase(c)
    
    // 创建文档
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title,
        content: content || null,
        word_count: content?.length || 0
      })
      .select()
      .single()
    
    if (docError) throw docError
    
    // 添加标签
    if (tags.length > 0) {
      const tagData = tags.map((tag: string) => ({
        document_id: document.id,
        tag
      }))
      
      await supabase
        .from('document_tags')
        .insert(tagData)
    }
    
    return c.json(document, 201)
  } catch (error) {
    console.error('Create document error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '创建文档失败'
      }
    }, 500)
  }
})

// ===========================================
// POST /api/documents/upload - 上传文件
// ===========================================

documentsRouter.post('/upload', async (c) => {
  const userId = getCurrentUserId(c)
  
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string || file.name
    const tagsStr = formData.get('tags') as string || '[]'
    const tags = JSON.parse(tagsStr)
    
    if (!file) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'file 是必填字段'
        }
      }, 400)
    }
    
    const supabase = getSupabase(c)
    const bucket = c.env.R2_BUCKET
    
    // 生成唯一文件名
    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const filePath = `${userId}/${fileName}`
    
    // 上传到 R2
    await bucket.put(filePath, file.stream(), {
      httpMetadata: {
        contentType: file.type
      }
    })
    
    // 创建文档记录
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type
      })
      .select()
      .single()
    
    if (docError) throw docError
    
    // 添加标签
    if (tags.length > 0) {
      const tagData = tags.map((tag: string) => ({
        document_id: document.id,
        tag
      }))
      
      await supabase
        .from('document_tags')
        .insert(tagData)
    }
    
    // 生成公共访问 URL (如果 bucket 配置了公共访问)
    const publicUrl = `https://r2.your-domain.com/${filePath}`
    
    return c.json({
      ...document,
      publicUrl,
      tags
    }, 201)
  } catch (error) {
    console.error('Upload document error:', error)
    
    return c.json({
      error: {
        code: 'UPLOAD_ERROR',
        message: '文件上传失败'
      }
    }, 500)
  }
})

// ===========================================
// GET /api/documents/:id - 获取文档详情
// ===========================================

documentsRouter.get('/:id', async (c) => {
  const userId = getCurrentUserId(c)
  const documentId = c.req.param('id')
  
  try {
    const supabase = getSupabase(c)
    
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()
    
    if (error || !document) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: '文档不存在'
        }
      }, 404)
    }
    
    // 获取标签
    const { data: tags } = await supabase
      .from('document_tags')
      .select('tag')
      .eq('document_id', documentId)
    
    return c.json({
      ...document,
      tags: tags?.map(t => t.tag) || []
    })
  } catch (error) {
    console.error('Get document error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '获取文档详情失败'
      }
    }, 500)
  }
})

// ===========================================
// PUT /api/documents/:id - 更新文档
// ===========================================

documentsRouter.put('/:id', async (c) => {
  const userId = getCurrentUserId(c)
  const documentId = c.req.param('id')
  const body = await c.req.json()
  
  const { title, content, tags } = body
  
  try {
    const supabase = getSupabase(c)
    
    // 更新文档
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) {
      updateData.content = content
      updateData.word_count = content?.length || 0
    }
    
    const { data: document, error: docError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (docError) throw docError
    
    // 更新标签
    if (tags !== undefined) {
      // 删除旧标签
      await supabase
        .from('document_tags')
        .delete()
        .eq('document_id', documentId)
      
      // 添加新标签
      if (tags.length > 0) {
        const tagData = tags.map((tag: string) => ({
          document_id: documentId,
          tag
        }))
        
        await supabase
          .from('document_tags')
          .insert(tagData)
      }
    }
    
    return c.json(document)
  } catch (error) {
    console.error('Update document error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '更新文档失败'
      }
    }, 500)
  }
})

// ===========================================
// DELETE /api/documents/:id - 删除文档
// ===========================================

documentsRouter.delete('/:id', async (c) => {
  const userId = getCurrentUserId(c)
  const documentId = c.req.param('id')
  
  try {
    const supabase = getSupabase(c)
    const bucket = c.env.R2_BUCKET
    
    // 获取文档信息 (用于删除 R2 文件)
    const { data: document } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()
    
    if (!document) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: '文档不存在'
        }
      }, 404)
    }
    
    // 删除 R2 文件
    if (document.file_path) {
      await bucket.delete(document.file_path)
    }
    
    // 删除数据库记录 (级联删除标签)
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId)
    
    if (error) throw error
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: '删除文档失败'
      }
    }, 500)
  }
})
