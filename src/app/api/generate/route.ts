import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { type, content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '内容不能为空' },
        { status: 400 }
      )
    }

    // 构建不同的 prompt
    const prompts = {
      summary: `请总结以下内容，提取核心要点，用简洁的中文输出：\n\n${content}`,
      ppt: `请根据以下内容生成一个 PPT 大纲，包含封面页、目录页、内容页和结束页的建议：\n\n${content}`,
      email: `请根据以下要求生成一封商务邮件，注意语气正式、结构清晰：\n\n${content}`,
    }

    const prompt = prompts[type] || prompts.summary

    // 调用智谱 AI API
    const apiKey = process.env.ZHIPU_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key 未配置' },
        { status: 500 }
      )
    }

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`API 请求失败：${response.status}`)
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content || '生成失败'

    return NextResponse.json({ result })
  } catch (error) {
    console.error('生成错误:', error)
    return NextResponse.json(
      { error: '生成失败，请稍后重试' },
      { status: 500 }
    )
  }
}
