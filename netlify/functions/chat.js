/**
 * netlify/functions/chat.js — Serverless Function（无服务器后端）
 *
 * 【为什么需要这个文件？】
 *   前端（index.html + chat.js）运行在用户浏览器里，代码完全可见。
 *   如果直接在前端调用 DeepSeek API，API Key 就会暴露给所有人，造成安全漏洞。
 *
 *   这个函数运行在 Netlify 的服务器上（用户看不到），
 *   可以安全地读取环境变量（process.env.DEEPSEEK_API_KEY），
 *   充当前端与 AI API 之间的"安全中间层"。
 *
 * 【访问路径】部署后：https://你的站点.netlify.app/.netlify/functions/chat
 * 【本地测试】运行 netlify dev 后：http://localhost:8888/.netlify/functions/chat
 *
 * 【DeepSeek API 特点】
 *   - 接口格式与 OpenAI 完全兼容（同样使用 /v1/chat/completions）
 *   - 认证方式相同：Bearer Token
 *   - 主力模型：deepseek-chat（DeepSeek-V3，性价比极高）
 *              deepseek-reasoner（DeepSeek-R1，擅长推理）
 *   - 官方文档：https://platform.deepseek.com/api-docs/
 *
 * 【exports.handler 模式】
 *   这是 Netlify Functions（以及 AWS Lambda）的标准函数签名：
 *   - event   : 包含请求信息（method, headers, body 等）
 *   - context : 包含 Netlify 环境信息（通常不常用）
 *   - 必须返回一个带有 statusCode 和 body 的对象
 */

// 使用 Node 内置的 https 模块发起请求（无需额外 npm 包）
const https = require('https');

// ──────────────────────────────────────────────────────────────────
// 核心：Lambda 风格的 Handler 函数
// ──────────────────────────────────────────────────────────────────
exports.handler = async function (event, context) {

  // 1. 只允许 POST 请求（GET 请求没有 body，不适合聊天 API）
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: '仅支持 POST 请求' }),
    };
  }

  // 2. 解析请求体
  let messages;
  try {
    const requestBody = JSON.parse(event.body);
    messages = requestBody.messages;

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

  // 3. 从环境变量中安全读取 API Key
  //    ⚠️  永远不要把真实 Key 硬编码在代码里！
  //    在 Netlify 后台：Site Settings → Environment Variables → Add variable
  //    变量名：DEEPSEEK_API_KEY，值：你的真实 Key（以 sk- 开头）
  //    获取地址：https://platform.deepseek.com/api_keys
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error('❌ 环境变量 DEEPSEEK_API_KEY 未设置！');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: '服务器配置错误：API Key 未设置。请在 Netlify 环境变量中添加 DEEPSEEK_API_KEY。',
      }),
    };
  }

  // 4. 构造 DeepSeek API 请求体
  //    DeepSeek 与 OpenAI 格式完全兼容：
  //    messages 数组直接使用 { role: 'user'|'assistant', content: string } 格式，
  //    与前端传来的格式一致，无需任何转换！（这是相比 Gemini 更简洁的地方）
  const deepseekPayload = JSON.stringify({
    model: 'deepseek-chat',   // deepseek-chat = DeepSeek-V3（通用对话）
                               // 可换为 'deepseek-reasoner'（DeepSeek-R1，擅长数学/逻辑推理）
    messages: messages,        // 直接传入，格式已兼容
    temperature: 0.7,          // 创造性（0=严谨确定，1=更发散）
    max_tokens: 1024,          // 最大回复长度
    stream: false,             // 非流式输出（流式需要不同的处理逻辑）
  });

  try {
    const aiReply = await callDeepSeekAPI(apiKey, deepseekPayload);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // CORS：允许前端（同域）调用
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

// ──────────────────────────────────────────────────────────────────
// 工具函数：通过 Node https 调用 DeepSeek REST API
// DeepSeek API 端点：https://api.deepseek.com/v1/chat/completions
// ──────────────────────────────────────────────────────────────────
function callDeepSeekAPI(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // DeepSeek 与 OpenAI 相同：使用 Bearer Token 认证
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          // 检查 API 错误（DeepSeek 错误格式与 OpenAI 相同）
          if (parsed.error) {
            return reject(new Error(parsed.error.message || 'DeepSeek API 返回错误'));
          }

          // 提取回复文本（OpenAI 兼容格式）
          const text =
            parsed?.choices?.[0]?.message?.content ||
            '（未能解析 AI 回复）';

          resolve(text);
        } catch (e) {
          reject(new Error('解析 DeepSeek 响应失败：' + e.message));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(60000, () => {  // DeepSeek 推理模型可能较慢，设置 60s 超时
      req.destroy();
      reject(new Error('请求超时（60s）'));
    });

    req.write(payload);
    req.end();
  });
}

/*
 * ──────────────────────────────────────────────────────────────────
 * 【扩展阅读】DeepSeek 模型选择指南
 * ──────────────────────────────────────────────────────────────────
 *
 * model: 'deepseek-chat'
 *   → DeepSeek-V3，通用对话模型，速度快，价格低，适合大多数场景
 *
 * model: 'deepseek-reasoner'
 *   → DeepSeek-R1，思维链推理模型，擅长数学、编程、逻辑分析
 *   → 注意：响应较慢，且返回结构中会包含 reasoning_content 字段
 *   → 提取方式：parsed?.choices?.[0]?.message?.content（同上）
 *
 * ──────────────────────────────────────────────────────────────────
 * 【扩展阅读】如何切换到 OpenAI API？
 * ──────────────────────────────────────────────────────────────────
 *
 * 由于 DeepSeek 与 OpenAI 接口格式相同，切换极为简单：
 *
 * 1. 将环境变量改为 OPENAI_API_KEY
 * 2. 将 hostname 改为 'api.openai.com'
 * 3. 将 model 改为 'gpt-4o-mini' 或 'gpt-4o'
 * 4. Authorization 头格式不变（同为 Bearer Token）
 *
 * 这也是 DeepSeek 的一大优势：无缝替换，迁移成本极低。
 */
