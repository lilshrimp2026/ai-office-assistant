-- ===========================================
-- 辅助函数：增加 AI 使用量
-- ===========================================

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  user_uuid UUID,
  tokens INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_quotas (user_id, date, ai_requests)
  VALUES (user_uuid, CURRENT_DATE, tokens)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET ai_requests = usage_quotas.ai_requests + tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权给认证用户
GRANT EXECUTE ON FUNCTION public.increment_ai_usage TO authenticated;
