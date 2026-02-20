/**
 * netlify/functions/chat.js — Serverless Function（无服务器后端）
 *
 * 支持两种调用场景：
 *   1. 教学大纲 AI 助手：前端传入 system prompt（角色设定）+ messages
 *   2. 普通聊天应用：仅传入 messages
 *
 * DeepSeek API 特点：
 *   - 接口与 OpenAI 完全兼容（/v1/chat/completions）
 *   - 支持 system / user / assistant 三种 role
 *   - 认证：Bearer Token
 *   - 文档：https://platform.deepseek.com/api-docs/
 */

const https = require('https');

exports.handler = async function (event, context) {

  // 1. 只允许 POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: '仅支持 POST 请求' }),
    };
  }

  // 2. 解析请求体
  let messages, systemPrompt;
  try {
    const body = JSON.parse(event.body);
    messages     = body.messages;
    systemPrompt = typeof body.system === 'string' ? body.system.trim() : null;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages 字段为空或格式错误');
    }
  } catch (parseError) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `请求格式错误：${parseError.message}` }),
    };
  }

  // 3. 安全读取 API Key
  //    Netlify 后台：Site Settings → Environment Variables → DEEPSEEK_API_KEY
  //    获取：https://platform.deepseek.com/api_keys
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('❌ 环境变量 DEEPSEEK_API_KEY 未设置！');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: '服务器配置错误：请在 Netlify 环境变量中添加 DEEPSEEK_API_KEY。',
      }),
    };
  }

  // 4. 构造 DeepSeek 请求
  //    如果前端传了 system prompt（如 AI 助手角色设定），插入到 messages 最前面
  const fullMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const deepseekPayload = JSON.stringify({
    model: 'deepseek-chat',    // DeepSeek-V3，速度快，性价比高
                                // 换 'deepseek-reasoner' 可获得 R1 推理能力
    messages: fullMessages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: false,
  });

  try {
    const aiReply = await callDeepSeekAPI(apiKey, deepseekPayload);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ reply: aiReply }),
    };
  } catch (apiError) {
    console.error('DeepSeek API 调用失败：', apiError.message);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `AI 服务暂时不可用：${apiError.message}` }),
    };
  }
};

// ── 调用 DeepSeek REST API ────────────────────────────────────────
function callDeepSeekAPI(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || 'DeepSeek API 返回错误'));
          const text = parsed?.choices?.[0]?.message?.content || '（未能解析 AI 回复）';
          resolve(text);
        } catch (e) {
          reject(new Error('解析 DeepSeek 响应失败：' + e.message));
        }
      });
    });

    req.on('error', err => reject(err));
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('请求超时（60s）')); });
    req.write(payload);
    req.end();
  });
}

/*
 * 模型选择：
 *   'deepseek-chat'     → DeepSeek-V3，通用对话，速度快
 *   'deepseek-reasoner' → DeepSeek-R1，数学/推理/编程场景
 *
 * 切换至 OpenAI：
 *   hostname: 'api.openai.com'
 *   path: '/v1/chat/completions'
 *   model: 'gpt-4o-mini'
 *   Authorization 头格式相同
 */
