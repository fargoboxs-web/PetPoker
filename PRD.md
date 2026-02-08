# 新春宠物扑克牌生成器 - PetPoker

## 项目概述

用户上传宠物照片（猫/狗），AI 生成新春主题的定制扑克牌 King 牌，将宠物变成穿龙袍的皇帝。

## 商业模式
```
[免费体验] → [生成单张] → [觉得不错] → [购买实体扑克套牌]
```

---

## MVP 需求确认（访谈结果）

### 核心决策
| 决策项 | 最终选择 |
|--------|----------|
| 宠物类型 | 猫 + 狗 |
| 牌型 | 只做 King（皇帝龙袍风格） |
| 风格选择 | 砍掉（固定皇帝龙袍） |
| 相似度要求 | 必须像本宠（高优先） |
| 生成数量 | 每次 2 张供用户挑选 |

### 技术决策
| 决策项 | 最终选择 |
|--------|----------|
| AI 服务 | Gemini 3 Pro Image via api.mmw.ink（支持 Gemini/OpenAI-images 双模式） |
| 前端 | Next.js 16 + React 19 + TailwindCSS 4 |
| 部署 | Vercel |
| API Key | 通过 .env.local 配置（不提交到仓库） |

### UI/UX 决策
| 决策项 | 最终选择 |
|--------|----------|
| 目标设备 | 桌面优先 |
| 界面语言 | 中文 |
| 上传限制 | 建议正方形/头部特写（提示但不强制） |
| 等待体验 | 普通 loading + 进度提示 |
| 翻牌动效 | 保留 |

### 输出规格
| 决策项 | 最终选择 |
|--------|----------|
| 图片比例 | 扑克牌标准比例 (2.5:3.5 ≈ 714x1000px) |
| 边框处理 | 先尝试 AI 直接生成；备选：宠物元素 + 现成边框合成 |
| 素材 | 有现成扑克牌边框模板 |

---

## 简化后的用户流程

```
上传猫/狗照片 → AI 生成 2 张皇帝龙袍 King 牌 → 用户选择 → 翻牌动效展示 → 下载
```

---

## 技术实现方案

### 1. AI 图像生成 - Gemini 3 Pro Image

**服务信息**
- 模型: `[A]gemini-3-pro-image-preview`（可选 2K/4K 后缀版本）
- 接入方式: api.mmw.ink（Gemini 兼容接口）
- 特点: 支持多图输入、身份保持、高质量文字渲染

**支持的模型列表**
- `gemini-3-pro-image-preview`
- `gemini-3-pro-image-preview-2k`
- `gemini-3-pro-image-preview-4k`
- `[A]gemini-3-pro-image-preview`
- `[A]gemini-3-pro-image-preview-2k`
- `[A]gemini-3-pro-image-preview-4k`

**API 模式**
后端支持三种 API 模式（通过 `NANOBANANA_API_MODE` 配置）：

1. **gemini**（默认）：调用 Gemini 风格的 `generateContent` 端点
   - 端点回退顺序：`/v1beta/models/{model}:generateContent` → `/v1/models/{model}:generateContent`

2. **openai-images**：调用 OpenAI 风格的 `/v1/images/edits` 端点（multipart form-data）

3. **auto**：先尝试 Gemini 模式，失败后回退到 openai-images

**认证回退机制**
后端自动尝试多种认证头（去重后按顺序）：
1. 自定义认证头（`NANOBANANA_AUTH_HEADER` + `NANOBANANA_AUTH_SCHEME`）
2. `x-goog-api-key: <key>`
3. `Authorization: Bearer <key>`

**响应解析**
支持多种上游响应格式：
- OpenAI 风格: `data[0].url` 或 `data[0].b64_json`
- Gemini 风格: `candidates[].content.parts[].inlineData`
- 文本中包含的图片 URL（正则提取）

### 2. 前端技术栈

```
Next.js 16 (App Router)
├── React 19
├── TailwindCSS 4
├── Framer Motion (翻牌动效)
└── React Dropzone (图片上传)
```

### 3. 项目结构

```
/src/app
  /page.tsx                 # 主页面（客户端组件，状态机驱动）
  /layout.tsx               # 布局组件
  /api
    /generate/route.ts      # AI 生成 API（支持双模式 + 认证回退）
/src/components
  /ImageUploader.tsx        # 图片上传组件
  /PokerCard.tsx            # 扑克牌展示组件（含翻转动效）
  /CardSelector.tsx         # 双卡选择组件
  /LoadingState.tsx         # 加载状态组件
/public
  /poker-template.png       # 扑克牌边框模板
```

### 4. 核心组件设计

#### 4.1 主页面状态流
```typescript
type AppState =
  | { step: 'upload' }                           // 初始：上传照片
  | { step: 'generating', petImage: string }     // 生成中
  | { step: 'select', cards: [string, string] }  // 选择卡片
  | { step: 'result', selectedCard: string }     // 展示结果
```

#### 4.2 扑克牌翻转动效
```typescript
// 使用 Framer Motion 实现 3D 翻转
const cardVariants = {
  front: { rotateY: 0 },
  back: { rotateY: 180 }
};

<motion.div
  style={{ transformStyle: 'preserve-3d' }}
  animate={isFlipped ? 'front' : 'back'}
  variants={cardVariants}
  transition={{ duration: 0.6, ease: 'easeInOut' }}
>
  {/* 正面：生成的扑克牌 */}
  {/* 背面：扑克牌花纹 */}
</motion.div>
```

#### 4.3 图片上传组件
```typescript
// 功能要点
- 拖拽上传 + 点击上传
- 图片预览
- 提示文案："建议上传宠物头部特写，正方形效果最佳"
- 文件类型限制：jpg, png, webp
- 大小限制：10MB
- 自动压缩到合适尺寸再上传
```

### 5. API 设计

#### POST /api/generate
```typescript
// Request
{
  petImage: string;  // base64 data URL (data:image/png;base64,...)
}

// Response - Success
{
  success: true;
  cards: [string, string];  // 2 张生成的卡片 (URL 或 base64 data URL)
}

// Response - Error
{
  success: false;
  error: string;
}
```

**实现逻辑：**
1. 接收宠物照片 base64 data URL
2. 当 `NANOBANANA_INCLUDE_TEMPLATE=1` 时，读取扑克牌边框模板 `/poker-template.png`
3. 并行调用 AI API 2 次（生成 2 张供选择）
4. 自动尝试多种认证头和端点路径
5. 支持多种响应格式解析

### 6. 环境变量

```env
# 必填
NANOBANANA_API_KEY=your_api_key_here

# Provider 配置
NANOBANANA_BASE_URL=https://api.mmw.ink
NANOBANANA_MODEL=[A]gemini-3-pro-image-preview
NANOBANANA_API_MODE=gemini          # gemini | openai-images | auto
NANOBANANA_IMAGE_SIZE=2K
NANOBANANA_INCLUDE_TEMPLATE=1

# 可选
NANOBANANA_TIMEOUT_MS=300000
NANOBANANA_GEMINI_ENDPOINT_TEMPLATE=/v1beta/models/{model}:generateContent
NANOBANANA_DEBUG=0                  # 1 = 开启调试日志

# 自定义认证头（可选）
# NANOBANANA_AUTH_HEADER=Authorization
# NANOBANANA_AUTH_SCHEME=Bearer
# NANOBANANA_GROUP=your_group
# NANOBANANA_EXTRA_HEADERS={"x-api-version":"2025-01-01"}

# openai-images 模式专用（可选）
# NANOBANANA_IMAGE_ENDPOINT=/v1/images/edits
# NANOBANANA_MODEL_FIELD=model
# NANOBANANA_PROMPT_FIELD=prompt
# NANOBANANA_IMAGE_FIELD=image
```

**安全注意事项：**
- API Key 存放在 `.env.local`，已加入 `.gitignore`
- 切勿提交 `.env.local` 到仓库
- 如 Key 泄露，需在 Provider 侧轮换

---

## 开发阶段划分

### Phase 1: 项目搭建 + 基础 UI
- [ ] `npx create-next-app@latest` 初始化项目
- [ ] 配置 TailwindCSS
- [ ] 安装依赖：framer-motion, react-dropzone
- [ ] 创建基础页面布局（中文界面）
- [ ] 实现 ImageUploader 组件

### Phase 2: AI API 集成
- [ ] 封装 OpenRouter API 调用
- [ ] 创建 /api/generate 路由
- [ ] 设计并测试 Prompt 模板
- [ ] 处理图片 base64 编码/解码

### Phase 3: 核心交互流程
- [ ] 实现生成状态管理
- [ ] 创建 LoadingState 组件（进度提示）
- [ ] 创建 CardSelector 组件（双卡选择）
- [ ] 实现选择逻辑

### Phase 4: 翻牌动效 + 下载
- [ ] 创建 PokerCard 组件（3D 翻转）
- [ ] 实现翻牌揭示动效
- [ ] 实现图片下载功能
- [ ] 添加"再来一张"重置流程

### Phase 5: 美化 + 测试
- [ ] 新春主题视觉设计（红金配色）
- [ ] 响应式适配检查
- [ ] 错误处理和边界情况
- [ ] 部署到 Vercel

---

## Prompt 优化策略

### 主 Prompt（中文，效果更好）
```
你是一个专业的扑克牌设计师。请根据我提供的宠物照片，创作一张新春主题的扑克牌 K（King）。

【宠物特征要求】- 最重要！
- 必须完全保留照片中宠物的外观：毛色、花纹、眼睛颜色、耳朵形状
- 宠物的脸部特征必须可辨认，让主人一眼就能认出是自己的宠物

【服装设计】
- 中国古代皇帝龙袍：明黄色为主，绣有金龙图案
- 头戴皇冠或龙冠
- 可添加玉佩、朝珠等配饰

【扑克牌格式】
- 标准扑克牌比例 2.5:3.5
- 左上角：红色 K 字母 + 红桃符号
- 右下角：倒置的 K + 红桃（传统扑克牌对称设计）
- 边框：金色华丽边框，带中国传统纹样

【背景与氛围】
- 红色、金色为主色调
- 可包含：祥云、金元宝、红灯笼、烟花等新春元素
- 整体喜庆、华丽、适合新年氛围

【风格】
- 高质量数字插画
- 色彩饱满、细节丰富
- 类似高端定制扑克牌的精美质感
```

### 备选方案：分步生成
如果直接生成完整扑克牌效果不佳，采用分步方案：
1. 第一步：只生成穿龙袍的宠物形象（无边框）
2. 第二步：前端使用 Canvas 将宠物图像合成到扑克牌模板中

---

## 风险与应对

| 风险 | 应对方案 |
|------|----------|
| 宠物特征丢失 | 强调 Prompt 中的特征保持要求；生成 2 张供选择 |
| API 响应慢 | 显示进度提示；设置合理超时（60s） |
| 生成失败 | 友好错误提示 + 重试按钮 |
| 边框生成不佳 | 启用备选方案：AI 生成宠物 + 前端合成边框 |
| API 被滥用 | MVP 阶段暂不限制；后续可加 IP 限流 |

---

## 资源清单

### 需要准备
1. [x] 扑克牌边框模板（你已有）
2. [ ] OpenRouter API Key
3. [ ] Vercel 账号（部署用）

### 参考资源
- [OpenRouter API 文档](https://openrouter.ai/docs)
- [Nano Banana Pro 模型页面](https://openrouter.ai/google/gemini-3-pro-image-preview)
- [Framer Motion 文档](https://www.framer.com/motion/)

---

## 下一步行动

1. **获取 OpenRouter API Key** - 注册并获取密钥
2. **准备扑克牌边框模板** - 放入项目 public 目录
3. **开始 Phase 1 开发** - 项目初始化 + 基础 UI
