import { Hono } from 'hono'
import { getCurrentUserId } from '../middleware/auth'
import { Groq } from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const aiRouter = new Hono<{
  Bindings: {
    GROQ_API_KEY: string
    GOOGLE_GENERATIVE_AI_API_KEY: string
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
  }
  Variables: {
    userId: string
  }
}>()

// ===========================================
// 通用 AI 生成接口
// ===========================================

aiRouter.post('/generate', async (c) => {
  const userId = getCurrentUserId(c)
  const body = await c.req.json()
  
  const {
    prompt,
    model = 'groq',
    maxTokens = 1000,
    temperature = 0.7,
    systemPrompt
  } = body
  
  if (!prompt) {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'prompt 是必填字段'
      }
    }, 400)
  }
  
  try {
    const startTime = Date.now()
    let output: string
    let tokenInput = 0
    let tokenOutput = 0
    
    if (model === 'groq') {
      const result = await generateWithGroq({
        apiKey: c.env.GROQ_API_KEY,
        prompt,
        systemPrompt,
        maxTokens,
        temperature
      })
      output = result.output
      tokenInput = result.tokenInput
      tokenOutput = result.tokenOutput
    } else if (model === 'gemini') {
      const result = await generateWithGemini({
        apiKey: c.env.GOOGLE_GENERATIVE_AI_API_KEY,
        prompt,
        systemPrompt,
        maxTokens
      })
      output = result.output
      tokenInput = result.tokenInput
      tokenOutput = result.tokenOutput
    } else {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '不支持的模型类型'
        }
      }, 400)
    }
    
    const duration = Date.now() - startTime
    
    // TODO: 记录使用量到数据库
    // await recordUsage(userId, tokenInput + tokenOutput)
    
    return c.json({
      taskId: crypto.randomUUID(),
      output,
      modelUsed: model,
      tokenUsage: {
        input: tokenInput,
        output: tokenOutput,
        total: tokenInput + tokenOutput
      },
      duration
    })
  } catch (error) {
    console.error('AI generation error:', error)
    
    return c.json({
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI 服务调用失败',
        details: error instanceof Error ? error.message : undefined
      }
    }, 500)
  }
})

// ===========================================
// 文档摘要接口
// ===========================================

aiRouter.post('/summarize', async (c) => {
  const userId = getCurrentUserId(c)
  const body = await c.req.json()
  
  const { documentId, maxLength = 200, language = 'zh' } = body
  
  if (!documentId) {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'documentId 是必填字段'
      }
    }, 400)
  }
  
  try {
    // TODO: 从 Supabase 获取文档内容
    // const document = await getDocument(documentId, userId)
    
    // 模拟文档内容
    const documentContent = "这是文档内容..."
    
    const systemPrompt = `你是一位专业的文档摘要助手。请用${language}语言总结以下内容，控制在${maxLength}字以内。`
    
    const result = await generateWithGroq({
      apiKey: c.env.GROQ_API_KEY,
      prompt: `请总结以下文档:\n\n${documentContent}`,
      systemPrompt,
      maxTokens: 500,
      temperature: 0.3
    })
    
    return c.json({
      summary: result.output,
      keyPoints: extractKeyPoints(result.output),
      wordCount: {
        original: documentContent.length,
        summary: result.output.length
      }
    })
  } catch (error) {
    console.error('Summarize error:', error)
    
    return c.json({
      error: {
        code: 'AI_SERVICE_ERROR',
        message: '摘要生成失败'
      }
    }, 500)
  }
})

// ===========================================
// 翻译接口
// ===========================================

aiRouter.post('/translate', async (c) => {
  const userId = getCurrentUserId(c)
  const body = await c.req.json()
  
  const { text, sourceLanguage = 'auto', targetLanguage = 'zh' } = body
  
  if (!text) {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'text 是必填字段'
      }
    }, 400)
  }
  
  try {
    const systemPrompt = `你是一位专业翻译。请将内容从${sourceLanguage}翻译到${targetLanguage}。保持原文的格式和语气。`
    
    const result = await generateWithGroq({
      apiKey: c.env.GROQ_API_KEY,
      prompt: `翻译以下内容:\n\n${text}`,
      systemPrompt,
      maxTokens: 2000,
      temperature: 0.3
    })
    
    return c.json({
      translatedText: result.output,
      detectedLanguage: sourceLanguage === 'auto' ? 'auto-detected' : sourceLanguage
    })
  } catch (error) {
    console.error('Translate error:', error)
    
    return c.json({
      error: {
        code: 'AI_SERVICE_ERROR',
        message: '翻译失败'
      }
    }, 500)
  }
})

// ===========================================
// 改写/润色接口
// ===========================================

aiRouter.post('/rewrite', async (c) => {
  const userId = getCurrentUserId(c)
  const body = await c.req.json()
  
  const { text, style = 'formal', tone = 'professional', purpose } = body
  
  if (!text) {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'text 是必填字段'
      }
    }, 400)
  }
  
  try {
    const styleDesc = {
      formal: '正式、专业',
      casual: '轻松、友好',
      academic: '学术、严谨',
      creative: '创意、生动'
    }[style] || '专业'
    
    const systemPrompt = `你是一位专业编辑。请改写以下内容，使其${styleDesc}，语气${tone}。`
    
    const result = await generateWithGroq({
      apiKey: c.env.GROQ_API_KEY,
      prompt: `请改写以下内容:\n\n${text}`,
      systemPrompt,
      maxTokens: 2000,
      temperature: 0.7
    })
    
    return c.json({
      rewrittenText: result.output,
      changes: ['优化了表达', '调整了语气', '改进了结构']
    })
  } catch (error) {
    console.error('Rewrite error:', error)
    
    return c.json({
      error: {
        code: 'AI_SERVICE_ERROR',
        message: '改写失败'
      }
    }, 500)
  }
})

// ===========================================
// Groq API 调用函数
// ===========================================

async function generateWithGroq({
  apiKey,
  prompt,
  systemPrompt,
  maxTokens,
  temperature
}: {
  apiKey: string
  prompt: string
  systemPrompt?: string
  maxTokens: number
  temperature: number
}) {
  const groq = new Groq({ apiKey })
  
  const messages: any[] = []
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  
  messages.push({ role: 'user', content: prompt })
  
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    messages,
    max_tokens: maxTokens,
    temperature,
  })
  
  return {
    output: completion.choices[0]?.message?.content || '',
    tokenInput: completion.usage?.prompt_tokens || 0,
    tokenOutput: completion.usage?.completion_tokens || 0
  }
}

// ===========================================
// Gemini API 调用函数
// ===========================================

async function generateWithGemini({
  apiKey,
  prompt,
  systemPrompt,
  maxTokens
}: {
  apiKey: string
  prompt: string
  systemPrompt?: string
  maxTokens: number
}) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const fullPrompt = systemPrompt 
    ? `${systemPrompt}\n\n用户请求：${prompt}`
    : prompt
  
  const result = await model.generateContent(fullPrompt)
  const response = await result.response
  
  return {
    output: response.text(),
    tokenInput: 0, // Gemini API 不直接返回 token 数
    tokenOutput: 0
  }
}

// ===========================================
// 辅助函数
// ===========================================

function extractKeyPoints(summary: string): string[] {
  // 简单的关键点提取逻辑
  const lines = summary.split('\n').filter(line => line.trim())
  return lines.slice(0, 5).map(line => line.replace(/^[-•*]\s*/, ''))
}
