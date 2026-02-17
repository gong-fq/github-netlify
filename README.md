# 🤖 AI 聊天助手 — Netlify Serverless 部署实战

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-BADGE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE-NAME/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org)

> 一个零服务器费用的 AI 聊天应用，使用 **Netlify Serverless Functions** 安全调用 DeepSeek API。  
> 专为初学者设计——从 GitHub 推送到全球可访问，全程约 **10 分钟**。

---

## ✨ 功能特性

- 💬 **多轮对话**：保持上下文，支持连续追问
- 🔒 **API Key 安全**：Key 存放在 Netlify 环境变量，前端代码中永远不会出现
- ⚡ **Serverless 架构**：无服务器，按需运行，免费额度充足
- 📱 **响应式设计**：移动端与桌面端完美适配
- 🌐 **全球 CDN**：Netlify 自动将静态资源分发到全球边缘节点

---

## 📁 项目结构

```
ai-chat-app/
├── index.html                  # 前端入口：页面骨架与样式
├── chat.js                     # 前端逻辑：发送消息、渲染回复
├── package.json                # 项目清单：依赖与构建脚本
├── netlify.toml                # 部署配置：构建、重定向、环境隔离
├── netlify/
│   └── functions/
│       └── chat.js             # 🔑 核心：Serverless 后端，安全调用 DeepSeek
└── README.md                   # 本文件
```

---

## 🚀 快速开始（本地运行）

### 前置要求

| 工具 | 版本 | 安装 |
|------|------|------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| Git | 任意 | [git-scm.com](https://git-scm.com) |
| Netlify CLI | 最新 | 见下方 |

### 第一步：克隆仓库

```bash
# 将下面的 URL 替换为你自己的仓库地址
git clone https://github.com/你的用户名/ai-chat-app.git
cd ai-chat-app
```

### 第二步：安装依赖

```bash
npm install
```

> 这条命令会读取 `package.json` 中的 `dependencies`，自动下载所有需要的包到 `node_modules/`。

### 第三步：配置 API Key（本地）

```bash
# 创建本地环境变量文件（已在 .gitignore 中，不会被推送到 GitHub！）
echo "DEEPSEEK_API_KEY=你的真实Key" > .env
```

获取 DeepSeek API Key：[DeepSeek Platform](https://platform.deepseek.com/api_keys) → 免费创建

### 第四步：启动本地开发服务器

```bash
npm run dev
# 或者
npx netlify dev
```

访问 [http://localhost:8888](http://localhost:8888) 即可看到应用。

> `netlify dev` 会模拟完整的 Netlify 环境，包括 Functions 和环境变量，
> 确保本地行为与线上完全一致。

---

## ☁️ 部署到 Netlify

### 方法一：一键部署（推荐新手）

点击下方按钮，Netlify 会自动 fork 仓库并部署：

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/你的用户名/ai-chat-app)

> 📝 **如何获取这个按钮？**  
> 按钮格式为：`[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=你的仓库URL)`  
> 将上方的 `你的用户名/ai-chat-app` 替换为真实仓库路径即可。

### 方法二：手动部署

1. 登录 [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. 选择 **GitHub** 并授权
3. 选择你的仓库
4. 构建配置会自动从 `netlify.toml` 读取，无需手动填写
5. 点击 **Deploy site**

### 设置环境变量（必须！）

部署完成后：
1. 进入 **Site Settings → Environment Variables**
2. 点击 **Add a variable**
3. 填写：
   - **Key**: `DEEPSEEK_API_KEY`
   - **Value**: 你的真实 DeepSeek API Key
4. 点击 **Save**，然后触发一次重新部署

---

## 🔑 环境变量说明

| 变量名 | 必须 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek API 密钥，在 [DeepSeek Platform](https://platform.deepseek.com/api_keys) 获取 |

> ⚠️ **安全提示**：永远不要将真实 API Key 提交到 Git 仓库。  
> 本地使用 `.env` 文件（已被 `.gitignore` 忽略），线上使用 Netlify 环境变量配置。

---

## 🛠️ 技术架构

```
用户浏览器                   Netlify CDN                 Google AI
    │                            │                           │
    │  1. 用户输入消息            │                           │
    │──────────────────────────> │                           │
    │                            │                           │
    │  2. POST /.netlify/        │  3. 携带 API Key          │
    │     functions/chat         │─────────────────────────> │
    │                            │                           │
    │                            │  4. DeepSeek 生成回复        │
    │                            │ <─────────────────────────│
    │  5. 返回 AI 回复            │                           │
    │ <──────────────────────────│                           │
    │                            │                           │
    │  6. 渲染到页面              │                           │
```

**关键原则**：API Key 只在第 3 步出现，且仅在 Netlify 的服务器内存中，用户永远无法看到。

---

## 🎯 新手学习路径

推荐按以下顺序理解项目：

1. **`index.html`** → 看到页面，理解 DOM 结构和资源引用
2. **`chat.js`** → 理解前端如何发送请求和渲染结果
3. **`package.json`** → 理解依赖管理和构建命令
4. **`netlify.toml`** → 理解部署配置和重定向规则
5. **`netlify/functions/chat.js`** → 理解 Serverless 的核心价值

---

## 🐛 常见问题

**Q: 部署后聊天没有回复，提示 502？**  
A: 检查 Netlify 环境变量中是否正确配置了 `DEEPSEEK_API_KEY`，注意 Key 前后不要有多余空格。

**Q: 本地运行报错 "DEEPSEEK_API_KEY 未设置"？**  
A: 确认项目根目录有 `.env` 文件，且内容为 `DEEPSEEK_API_KEY=你的Key`（不要有引号）。

**Q: 刷新页面出现 404？**  
A: 检查 `netlify.toml` 中的重定向规则是否存在，以及 `publish` 目录配置是否正确。

**Q: 如何换用 OpenAI 的 GPT 模型？**  
A: 参见 `netlify/functions/chat.js` 文件末尾的注释，有详细的替换步骤。

---

## 📚 参考资源

- [Netlify Functions 官方文档](https://docs.netlify.com/functions/overview/)
- [Netlify TOML 配置参考](https://docs.netlify.com/configure-builds/file-based-configuration/)
- [Google DeepSeek API 文档](https://ai.google.dev/deepseek-api/docs)
- [Netlify 环境变量配置](https://docs.netlify.com/environment-variables/overview/)

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源，欢迎学习和二次开发。
