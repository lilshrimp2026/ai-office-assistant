# AI 办公助手 - API 接口文档

## 📋 概览

- **Base URL**: `https://api.your-domain.com`
- **认证方式**: Bearer Token (JWT)
- **响应格式**: JSON
- **错误格式**: 
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "人类可读的错误信息",
    "details": {}
  }
}
```

## 🔐 认证

所有需要认证的接口需在 Header 中携带:
```
Authorization: Bearer <jwt_token>
```

### 获取 Token

通过 Supabase Auth 登录后获取:

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
// data.session.access_token 即为 JWT
```

---

## 👤 认证接口 (Auth)

### POST /api/auth/signup

用户注册

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "张三"
}
```

**响应 (201)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "张三"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_at": 1704067200
  }
}
```

### POST /api/auth/signin

用户登录

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**响应 (200)**: 同 signup

### POST /api/auth/signout

用户登出

**响应 (200)**:
```json
{ "success": true }
```

### POST /api/auth/refresh

刷新 Token

**请求体**:
```json
{ "refresh_token": "refresh_token" }
```

**响应 (200)**:
```json
{
  "access_token": "new_jwt_token",
  "refresh_token": "new_refresh_token",
  "expires_at": 1704067200
}
```

---

## 💬 对话接口 (Conversations)

### GET /api/conversations

获取用户的对话列表

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20
- `archived` (可选): 是否包含已归档，默认 false

**响应 (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "文档摘要任务",
      "modelUsed": "groq",
      "tokenCount": 1250,
      "messageCount": 5,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### POST /api/conversations

创建新对话

**请求体**:
```json
{
  "title": "新对话",
  "modelPreference": "groq"
}
```

**响应 (201)**:
```json
{
  "id": "uuid",
  "title": "新对话",
  "modelUsed": "groq",
  "createdAt": "2024-01-01T10:00:00Z"
}
```

### GET /api/conversations/:id

获取对话详情 (含消息)

**响应 (200)**:
```json
{
  "id": "uuid",
  "title": "文档摘要任务",
  "modelUsed": "groq",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "请帮我总结这篇文章",
      "createdAt": "2024-01-01T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "这篇文章的主要内容是...",
      "createdAt": "2024-01-01T10:00:05Z"
    }
  ]
}
```

### POST /api/conversations/:id/messages

发送消息

**请求体**:
```json
{
  "content": "请帮我总结这篇文章",
  "attachments": ["file-uuid-1", "file-uuid-2"]
}
```

**响应 (201)**:
```json
{
  "message": {
    "id": "uuid",
    "role": "user",
    "content": "请帮我总结这篇文章",
    "createdAt": "2024-01-01T10:00:00Z"
  },
  "response": {
    "id": "uuid",
    "role": "assistant",
    "content": "这篇文章的主要内容是...",
    "modelUsed": "groq",
    "tokenCount": 350,
    "createdAt": "2024-01-01T10:00:05Z"
  },
  "usage": {
    "aiRequestsToday": 15,
    "aiRequestsLimit": 100
  }
}
```

### PUT /api/conversations/:id

更新对话

**请求体**:
```json
{
  "title": "新标题",
  "isArchived": true
}
```

**响应 (200)**: 更新后的对话对象

### DELETE /api/conversations/:id

删除对话

**响应 (200)**:
```json
{ "success": true }
```

---

## 📄 文档接口 (Documents)

### GET /api/documents

获取文档列表

**查询参数**:
- `page`, `limit`: 分页
- `tag`: 按标签筛选
- `search`: 搜索标题/内容

**响应 (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "会议纪要",
      "wordCount": 1500,
      "fileType": "text/plain",
      "fileSize": 2048,
      "tags": ["会议", "工作"],
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### POST /api/documents

创建文档

**请求体**:
```json
{
  "title": "会议纪要",
  "content": "会议内容...",
  "tags": ["会议", "工作"]
}
```

**响应 (201)**: 创建的文档对象

### POST /api/documents/upload

上传文件

**Content-Type**: `multipart/form-data`

**表单字段**:
- `file`: 文件
- `title`: 标题 (可选)
- `tags`: 标签 (可选，JSON 数组)

**响应 (201)**:
```json
{
  "id": "uuid",
  "title": "上传的文件.pdf",
  "filePath": "user-uuid/doc-uuid.pdf",
  "fileSize": 102400,
  "fileType": "application/pdf",
  "publicUrl": "https://r2.your-domain.com/user-uuid/doc-uuid.pdf"
}
```

### GET /api/documents/:id

获取文档详情

**响应 (200)**:
```json
{
  "id": "uuid",
  "title": "会议纪要",
  "content": "完整内容...",
  "wordCount": 1500,
  "tags": ["会议", "工作"],
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T11:00:00Z"
}
```

### PUT /api/documents/:id

更新文档

**请求体**:
```json
{
  "title": "新标题",
  "content": "新内容",
  "tags": ["新标签"]
}
```

### DELETE /api/documents/:id

删除文档

**响应 (200)**: `{ "success": true }`

---

## 🤖 AI 任务接口 (AI Tasks)

### POST /api/ai/generate

通用 AI 生成接口

**请求体**:
```json
{
  "prompt": "请帮我写一封邮件",
  "model": "groq",
  "template": "email-formal",
  "context": {
    "recipient": "客户",
    "topic": "项目进度汇报",
    "tone": "professional"
  },
  "maxTokens": 1000,
  "temperature": 0.7
}
```

**响应 (200)**:
```json
{
  "taskId": "uuid",
  "output": "生成的内容...",
  "modelUsed": "groq",
  "tokenUsage": {
    "input": 150,
    "output": 350,
    "total": 500
  },
  "duration": 1250
}
```

### POST /api/ai/summarize

文档摘要

**请求体**:
```json
{
  "documentId": "uuid",
  "maxLength": 200,
  "language": "zh"
}
```

**响应 (200)**:
```json
{
  "summary": "摘要内容...",
  "keyPoints": ["要点 1", "要点 2", "要点 3"],
  "wordCount": {
    "original": 1500,
    "summary": 200
  }
}
```

### POST /api/ai/translate

翻译

**请求体**:
```json
{
  "text": "Hello World",
  "sourceLanguage": "en",
  "targetLanguage": "zh"
}
```

**响应 (200)**:
```json
{
  "translatedText": "你好世界",
  "detectedLanguage": "en"
}
```

### POST /api/ai/rewrite

改写/润色

**请求体**:
```json
{
  "text": "原始文本",
  "style": "formal",
  "tone": "professional",
  "purpose": "business-email"
}
```

**响应 (200)**:
```json
{
  "rewrittenText": "改写后的文本...",
  "changes": ["改进 1", "改进 2"]
}
```

### POST /api/ai/extract

信息提取

**请求体**:
```json
{
  "text": "包含信息的文本",
  "fields": ["name", "date", "amount", "description"]
}
```

**响应 (200)**:
```json
{
  "extracted": {
    "name": "张三",
    "date": "2024-01-01",
    "amount": 1000,
    "description": "项目费用"
  },
  "confidence": 0.95
}
```

---

## 📊 配额与使用接口 (Usage)

### GET /api/usage/quota

获取当前配额使用情况

**响应 (200)**:
```json
{
  "plan": "free",
  "aiRequests": {
    "used": 45,
    "limit": 100,
    "resetsAt": "2024-01-02T00:00:00Z"
  },
  "storage": {
    "used": 50,
    "limit": 100,
    "unit": "MB"
  }
}
```

### GET /api/usage/history

使用历史

**查询参数**:
- `days`: 天数，默认 7

**响应 (200)**:
```json
{
  "data": [
    {
      "date": "2024-01-01",
      "aiRequests": 45,
      "storageUsed": 50
    }
  ]
}
```

---

## 💳 订阅接口 (Subscriptions)

### GET /api/subscriptions/plans

获取订阅计划列表

**响应 (200)**:
```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "free",
      "displayName": "免费计划",
      "priceMonthly": 0,
      "priceYearly": 0,
      "features": ["每日 100 次 AI 请求", "100MB 存储"],
      "aiQuotaDaily": 100,
      "storageQuotaMb": 100
    }
  ]
}
```

### GET /api/subscriptions/current

获取当前订阅

**响应 (200)**:
```json
{
  "plan": {
    "id": "uuid",
    "name": "pro",
    "displayName": "专业计划"
  },
  "status": "active",
  "currentPeriodEnd": "2024-02-01T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

### POST /api/subscriptions/checkout

创建订阅结账会话

**请求体**:
```json
{
  "planId": "uuid",
  "billingCycle": "monthly"
}
```

**响应 (200)**:
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_..."
}
```

### POST /api/subscriptions/cancel

取消订阅

**响应 (200)**:
```json
{
  "success": true,
  "accessUntil": "2024-02-01T00:00:00Z"
}
```

---

## 🔑 API 密钥接口 (API Keys)

### GET /api/keys

获取用户的 API 密钥列表

**响应 (200)**:
```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "Production Key",
      "keyPrefix": "sk_abc123",
      "permissions": ["read", "write"],
      "lastUsedAt": "2024-01-01T10:00:00Z",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/keys

创建新 API 密钥

**请求体**:
```json
{
  "name": "Production Key",
  "permissions": ["read", "write"],
  "expiresIn": 365
}
```

**响应 (201)**:
```json
{
  "key": {
    "id": "uuid",
    "name": "Production Key",
    "keyPrefix": "sk_abc123"
  },
  "secretKey": "sk_full_secret_key_here"
}
```

⚠️ **注意**: `secretKey` 只会显示一次，请妥善保存!

### DELETE /api/keys/:id

撤销 API 密钥

**响应 (200)**: `{ "success": true }`

---

## 📈 错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|----------|------|
| `AUTH_REQUIRED` | 401 | 未提供认证 token |
| `AUTH_INVALID` | 401 | Token 无效或过期 |
| `FORBIDDEN` | 403 | 无权访问资源 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `QUOTA_EXCEEDED` | 429 | 配额已用尽 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 🔄 Webhook (Stripe)

### POST /api/webhooks/stripe

处理 Stripe 支付事件

**支持的事件**:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**响应 (200)**: `{ "received": true }`

---

## 📝 使用示例

### TypeScript 示例

```typescript
// 创建对话并发送消息
const response = await fetch('/api/conversations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: '新对话',
    modelPreference: 'groq'
  })
})

const conversation = await response.json()

// 发送消息
const messageResponse = await fetch(
  `/api/conversations/${conversation.id}/messages`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: '请帮我写一封邮件'
    })
  }
)

const { response: aiResponse } = await messageResponse.json()
console.log(aiResponse.content)
```

### cURL 示例

```bash
# 获取对话列表
curl -X GET "https://api.your-domain.com/api/conversations" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 创建文档
curl -X POST "https://api.your-domain.com/api/documents" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"会议纪要","content":"内容..."}'
```
