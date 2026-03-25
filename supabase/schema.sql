-- ===========================================
-- AI 办公助手 - Supabase 数据库 Schema
-- ===========================================
-- 版本：1.0.0
-- 创建时间：2024-01-01
-- ===========================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- 1. 用户相关表
-- ===========================================

-- 用户扩展信息表 (与 Supabase Auth 的 auth.users 关联)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'premium')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户索引
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- ===========================================
-- 2. 订阅与支付相关表
-- ===========================================

-- 订阅计划表
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER DEFAULT 0, -- 单位：分
  price_yearly INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]',
  ai_quota_daily INTEGER DEFAULT 100,
  storage_quota_mb INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户订阅表
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  stripe_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订阅索引
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- 使用配额追踪表
CREATE TABLE public.usage_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  ai_requests INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- 配额索引
CREATE INDEX idx_usage_quotas_user_date ON public.usage_quotas(user_id, date);

-- ===========================================
-- 3. 文档与对话相关表
-- ===========================================

-- 对话会话表
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  model_used TEXT DEFAULT 'groq',
  token_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 对话索引
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);

-- 对话消息表
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 消息索引
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- 文档表
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  file_path TEXT, -- R2 存储路径
  file_size INTEGER DEFAULT 0,
  file_type TEXT,
  word_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文档索引
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX idx_documents_is_public ON public.documents(is_public);

-- 文档标签表
CREATE TABLE public.document_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, tag)
);

-- 标签索引
CREATE INDEX idx_document_tags_document_id ON public.document_tags(document_id);
CREATE INDEX idx_document_tags_tag ON public.document_tags(tag);

-- ===========================================
-- 4. AI 任务与模板相关表
-- ===========================================

-- AI 任务模板表
CREATE TABLE public.ai_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  prompt_template TEXT NOT NULL,
  model_preference TEXT DEFAULT 'groq',
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 模板索引
CREATE INDEX idx_ai_templates_category ON public.ai_templates(category);
CREATE INDEX idx_ai_templates_is_public ON public.ai_templates(is_public);

-- AI 任务执行记录表
CREATE TABLE public.ai_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.ai_templates(id),
  task_type TEXT NOT NULL,
  input TEXT,
  output TEXT,
  model_used TEXT NOT NULL,
  token_input INTEGER DEFAULT 0,
  token_output INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 任务索引
CREATE INDEX idx_ai_tasks_user_id ON public.ai_tasks(user_id);
CREATE INDEX idx_ai_tasks_status ON public.ai_tasks(status);
CREATE INDEX idx_ai_tasks_created_at ON public.ai_tasks(created_at DESC);

-- ===========================================
-- 5. 系统配置与日志表
-- ===========================================

-- API 密钥表 (用于第三方集成)
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- 用于显示密钥前缀 (如: sk_abc...)
  permissions JSONB DEFAULT '["read", "write"]',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API 密钥索引
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_prefix ON public.api_keys(key_prefix);

-- 系统日志表
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 日志索引
CREATE INDEX idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX idx_system_logs_action ON public.system_logs(action);
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);

-- ===========================================
-- 6. 行级安全策略 (RLS)
-- ===========================================

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Profiles 策略
CREATE POLICY "用户可查看自己的资料" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "用户可更新自己的资料" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Conversations 策略
CREATE POLICY "用户可查看自己的对话" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可创建自己的对话" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的对话" ON public.conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可删除自己的对话" ON public.conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Messages 策略 (通过 conversation 间接控制)
CREATE POLICY "用户可查看自己对话中的消息" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "用户可创建自己对话中的消息" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- Documents 策略
CREATE POLICY "用户可查看自己的文档" ON public.documents
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "用户可创建自己的文档" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的文档" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可删除自己的文档" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions 策略
CREATE POLICY "用户可查看自己的订阅" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Usage Quotas 策略
CREATE POLICY "用户可查看自己的配额" ON public.usage_quotas
  FOR SELECT USING (auth.uid() = user_id);

-- AI Tasks 策略
CREATE POLICY "用户可查看自己的任务" ON public.ai_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可创建自己的任务" ON public.ai_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- API Keys 策略
CREATE POLICY "用户可查看自己的 API 密钥" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可创建自己的 API 密钥" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可删除自己的 API 密钥" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- 7. 触发器 (自动更新 updated_at)
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要 updated_at 的表添加触发器
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===========================================
-- 8. 初始化数据
-- ===========================================

-- 插入默认订阅计划
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features, ai_quota_daily, storage_quota_mb) VALUES
('free', '免费计划', 0, 0, '["每日 100 次 AI 请求", "100MB 存储", "基础模板"]'::jsonb, 100, 100),
('pro', '专业计划', 2900, 29000, '["每日 1000 次 AI 请求", "5GB 存储", "高级模板", "优先支持"]'::jsonb, 1000, 5120),
('enterprise', '企业计划', 9900, 99000, '["无限 AI 请求", "50GB 存储", "自定义模板", "专属支持", "API 访问"]'::jsonb, 10000, 51200);

-- ===========================================
-- 9. 实用函数
-- ===========================================

-- 获取用户当前订阅计划
CREATE OR REPLACE FUNCTION public.get_user_subscription(user_uuid UUID)
RETURNS TABLE (
  plan_name TEXT,
  status TEXT,
  ai_quota_daily INTEGER,
  storage_quota_mb INTEGER,
  current_period_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name,
    s.status,
    sp.ai_quota_daily,
    sp.storage_quota_mb,
    s.current_period_end
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = user_uuid AND s.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户配额
CREATE OR REPLACE FUNCTION public.check_user_quota(user_uuid UUID, quota_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  daily_limit INTEGER;
  current_usage INTEGER;
BEGIN
  -- 获取用户的每日配额
  SELECT COALESCE(sp.ai_quota_daily, 100) INTO daily_limit
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = user_uuid AND s.status = 'active'
  LIMIT 1;
  
  -- 如果没有订阅，使用免费配额
  IF daily_limit IS NULL THEN
    daily_limit := 100;
  END IF;
  
  -- 获取今日已使用配额
  SELECT COALESCE(uq.ai_requests, 0) INTO current_usage
  FROM public.usage_quotas uq
  WHERE uq.user_id = user_uuid AND uq.date = CURRENT_DATE;
  
  -- 返回是否还有配额
  RETURN current_usage < daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 完成
-- ===========================================
