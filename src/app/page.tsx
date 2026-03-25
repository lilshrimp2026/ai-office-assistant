'use client'

import { useState } from 'react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'summary' | 'ppt' | 'email'>('summary')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!input.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          content: input,
        }),
      })
      const data = await response.json()
      setOutput(data.result || '生成失败，请重试')
    } catch (error) {
      setOutput('请求失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">🦐 AI 办公助手</h1>
          <p className="text-gray-600">文档总结 · PPT 大纲 · 邮件生成</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-6 py-3 font-medium transition ${
              activeTab === 'summary'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 文档总结
          </button>
          <button
            onClick={() => setActiveTab('ppt')}
            className={`px-6 py-3 font-medium transition ${
              activeTab === 'ppt'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 PPT 大纲
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-6 py-3 font-medium transition ${
              activeTab === 'email'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✉️ 邮件生成
          </button>
        </div>

        {/* Input */}
        <div className="mb-6">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeTab === 'summary'
                ? '请粘贴需要总结的文档内容...'
                : activeTab === 'ppt'
                ? '请输入 PPT 主题或内容...'
                : '请输入邮件要求和关键信息...'
            }
            className="w-full h-48 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !input.trim()}
          className="w-full py-3 px-6 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {loading ? '生成中...' : '✨ 立即生成'}
        </button>

        {/* Output */}
        {output && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">生成结果</h2>
            <div className="whitespace-pre-wrap text-gray-700">{output}</div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by 智谱 AI · Deployed on Zeabur</p>
          <p className="mt-2">GitHub: @lilshrimp2026</p>
        </footer>
      </div>
    </main>
  )
}
