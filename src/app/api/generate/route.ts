import { NextRequest, NextResponse } from 'next/server';

const NANO_API_KEY = process.env.NANOBANANA_API_KEY?.trim();
const NANO_BASE_URL = (process.env.NANOBANANA_BASE_URL || 'https://api.mmw.ink').replace(/\/+$/, '');
const NANO_MODEL = process.env.NANOBANANA_MODEL || '[A]gemini-3-pro-image-preview';
const NANO_API_MODE = (process.env.NANOBANANA_API_MODE || 'gemini').toLowerCase();
const NANO_GEMINI_ENDPOINT_TEMPLATE =
  process.env.NANOBANANA_GEMINI_ENDPOINT_TEMPLATE || '/v1beta/models/{model}:generateContent';
const NANO_IMAGE_SIZE = process.env.NANOBANANA_IMAGE_SIZE || '2K';
const NANO_TIMEOUT_MS = Number(process.env.NANOBANANA_TIMEOUT_MS || '300000');
const NANO_IMAGE_ENDPOINT = process.env.NANOBANANA_IMAGE_ENDPOINT || '/v1/images/edits';
const NANO_AUTH_HEADER = process.env.NANOBANANA_AUTH_HEADER || 'Authorization';
const NANO_AUTH_SCHEME = process.env.NANOBANANA_AUTH_SCHEME ?? 'Bearer';
const NANO_MODEL_FIELD = process.env.NANOBANANA_MODEL_FIELD || 'model';
const NANO_PROMPT_FIELD = process.env.NANOBANANA_PROMPT_FIELD || 'prompt';
const NANO_IMAGE_FIELD = process.env.NANOBANANA_IMAGE_FIELD || 'image';
const NANO_TEMPLATE_IMAGE_FIELD = process.env.NANOBANANA_TEMPLATE_IMAGE_FIELD || NANO_IMAGE_FIELD;
const NANO_INCLUDE_TEMPLATE = process.env.NANOBANANA_INCLUDE_TEMPLATE !== '0';
const NANO_GROUP = process.env.NANOBANANA_GROUP;
const NANO_EXTRA_HEADERS = process.env.NANOBANANA_EXTRA_HEADERS;
const NANO_DEBUG = process.env.NANOBANANA_DEBUG === '1';

type OpenAIImageItem = {
  url?: string;
  b64_json?: string;
};

type GeminiInlineData = {
  data?: string;
  mime_type?: string;
  mimeType?: string;
};

type GeminiPart = {
  text?: string;
  inline_data?: GeminiInlineData;
  inlineData?: GeminiInlineData;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type ApiResponsePayload = {
  data?: OpenAIImageItem[];
  candidates?: GeminiCandidate[];
};

type GeminiRequestPart =
  | { text: string }
  | {
      inlineData: {
        mimeType: string;
        data: string;
      };
    };

type GeminiGenerateRequestBody = {
  contents: Array<{
    role: 'user';
    parts: GeminiRequestPart[];
  }>;
  generationConfig: {
    responseModalities: string[];
    imageConfig: {
      imageSize: string;
    };
  };
};

const PROMPT = `你是一个专业的扑克牌设计师。请根据我提供的宠物照片，创作一张新春主题的扑克牌 K（King）。

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
- 参考第二张图片的扑克牌设计风格

【背景与氛围】
- 红色、金色为主色调
- 可包含：祥云、金元宝、红灯笼、烟花等新春元素
- 整体喜庆、华丽、适合新年氛围

【风格】
- 高质量数字插画
- 色彩饱满、细节丰富
- 类似高端定制扑克牌的精美质感

请生成一张完整的扑克牌图片。`;

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('不支持的图片格式（需要 base64 data URL）');
  }
  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  return new Blob([buffer], { type: mimeType });
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('不支持的图片格式（需要 base64 data URL）');
  }
  return { mimeType: match[1], base64Data: match[2] };
}

function parseExtraHeaders(): Record<string, string> {
  if (!NANO_EXTRA_HEADERS) return {};
  try {
    return JSON.parse(NANO_EXTRA_HEADERS) as Record<string, string>;
  } catch {
    throw new Error('NANOBANANA_EXTRA_HEADERS 不是有效的 JSON');
  }
}

function getCommonHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (NANO_GROUP) headers['X-Group'] = NANO_GROUP;
  Object.assign(headers, parseExtraHeaders());
  return headers;
}

function getAuthHeaderCandidates(): Record<string, string>[] {
  if (!NANO_API_KEY) return [];
  const candidates: Record<string, string>[] = [];

  if (NANO_AUTH_HEADER) {
    candidates.push({
      [NANO_AUTH_HEADER]: NANO_AUTH_SCHEME
        ? `${NANO_AUTH_SCHEME} ${NANO_API_KEY}`
        : `${NANO_API_KEY}`,
    });
  }

  candidates.push({ 'x-goog-api-key': NANO_API_KEY });
  candidates.push({ Authorization: `Bearer ${NANO_API_KEY}` });

  const deduped: Record<string, string>[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    const key = JSON.stringify(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }
  return deduped;
}

function resolveGeminiEndpointPath(): string {
  if (NANO_GEMINI_ENDPOINT_TEMPLATE.includes('{model}')) {
    return NANO_GEMINI_ENDPOINT_TEMPLATE.replace('{model}', encodeURIComponent(NANO_MODEL));
  }
  return NANO_GEMINI_ENDPOINT_TEMPLATE;
}

function getGeminiEndpointCandidates(): string[] {
  const encodedModel = encodeURIComponent(NANO_MODEL);
  const candidates = [
    resolveGeminiEndpointPath(),
    `/v1beta/models/${encodedModel}:generateContent`,
    `/v1/models/${encodedModel}:generateContent`,
  ];

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const normalized = candidate.startsWith('/') ? candidate : `/${candidate}`;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      deduped.push(normalized);
    }
  }
  return deduped;
}

function extractImageUrlFromText(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s)]+/);
  return match ? match[0] : null;
}

function parseImageFromResponse(rawData: unknown): string | null {
  const data = rawData as ApiResponsePayload;
  const first = data?.data?.[0];
  if (typeof first?.url === 'string') return first.url;
  if (typeof first?.b64_json === 'string') return `data:image/png;base64,${first.b64_json}`;

  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const texts: string[] = [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      const inline = part?.inlineData ?? part?.inline_data;
      const inlineData = inline?.data;
      if (typeof inlineData === 'string' && inlineData.length > 0) {
        if (inlineData.startsWith('data:')) return inlineData;
        const mimeType =
          typeof (inline?.mimeType ?? inline?.mime_type) === 'string'
            ? (inline?.mimeType ?? inline?.mime_type)
            : 'image/png';
        return `data:${mimeType};base64,${inlineData}`;
      }

      if (typeof part?.text === 'string' && part.text.trim().length > 0) {
        texts.push(part.text);
      }
    }
  }

  for (const text of texts) {
    const url = extractImageUrlFromText(text);
    if (url) return url;
  }

  return null;
}

async function fetchWithAuthFallback(
  url: string,
  body: BodyInit | string,
  contentType?: string
): Promise<unknown> {
  const authCandidates = getAuthHeaderCandidates();
  if (authCandidates.length === 0) {
    throw new Error('API Key 未配置');
  }

  const commonHeaders = getCommonHeaders();
  const errors: string[] = [];
  const timeoutMs = Number.isFinite(NANO_TIMEOUT_MS) && NANO_TIMEOUT_MS > 0 ? NANO_TIMEOUT_MS : 300000;

  for (const authHeaders of authCandidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = { ...commonHeaders, ...authHeaders };
      if (contentType) headers['Content-Type'] = contentType;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        errors.push(`${response.status}: ${errorText.slice(0, 400)}`);
        continue;
      }

      return await response.json();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : '请求失败');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`API 调用失败，已尝试多种认证方式: ${errors.join(' | ')}`);
}

async function generateCardViaGemini(petImage: string, templateImage: string): Promise<string> {
  const pet = parseDataUrl(petImage);
  const parts: GeminiRequestPart[] = [
    { text: PROMPT },
    {
      inlineData: {
        mimeType: pet.mimeType,
        data: pet.base64Data,
      },
    },
  ];

  if (NANO_INCLUDE_TEMPLATE) {
    const template = parseDataUrl(templateImage);
    parts.push({
      inlineData: {
        mimeType: template.mimeType,
        data: template.base64Data,
      },
    });
  }

  const requestBody: GeminiGenerateRequestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { imageSize: NANO_IMAGE_SIZE.toUpperCase() },
    },
  };

  const endpointCandidates = getGeminiEndpointCandidates();
  const endpointErrors: string[] = [];
  for (const endpointPath of endpointCandidates) {
    const endpoint = `${NANO_BASE_URL}${endpointPath}`;
    if (NANO_DEBUG) {
      console.log('Gemini-style request', {
        endpoint,
        model: NANO_MODEL,
        apiMode: NANO_API_MODE,
      });
    }

    try {
      const data = await fetchWithAuthFallback(endpoint, JSON.stringify(requestBody), 'application/json');
      const result = parseImageFromResponse(data);
      if (result) return result;
      endpointErrors.push(`响应成功但无法解析图片: ${endpointPath}`);
    } catch (error) {
      endpointErrors.push(`${endpointPath} => ${error instanceof Error ? error.message : '请求失败'}`);
    }
  }

  throw new Error(`Gemini 接口调用失败: ${endpointErrors.join(' | ')}`);
}

async function generateCardViaImageEndpoint(petImage: string, templateImage: string): Promise<string> {
  const formData = new FormData();
  formData.append(NANO_MODEL_FIELD, NANO_MODEL);
  formData.append(NANO_PROMPT_FIELD, PROMPT);
  formData.append(NANO_IMAGE_FIELD, dataUrlToBlob(petImage), 'pet.png');
  if (NANO_INCLUDE_TEMPLATE) {
    formData.append(NANO_TEMPLATE_IMAGE_FIELD, dataUrlToBlob(templateImage), 'template.png');
  }

  if (NANO_DEBUG) {
    console.log('Nano Banana request', {
      endpoint: `${NANO_BASE_URL}${NANO_IMAGE_ENDPOINT}`,
      model: NANO_MODEL,
      hasGroup: Boolean(NANO_GROUP),
      apiMode: NANO_API_MODE,
    });
  }

  const endpoint = `${NANO_BASE_URL}${NANO_IMAGE_ENDPOINT}`;
  const data = await fetchWithAuthFallback(endpoint, formData);
  const result = parseImageFromResponse(data);

  if (result) return result;

  console.error('Unexpected image endpoint response:', JSON.stringify(data, null, 2));
  throw new Error('无法解析生成的图片');
}

async function generateCard(petImage: string, templateImage: string): Promise<string> {
  if (NANO_API_MODE === 'openai-images') {
    return generateCardViaImageEndpoint(petImage, templateImage);
  }

  if (NANO_API_MODE === 'auto') {
    try {
      return await generateCardViaGemini(petImage, templateImage);
    } catch (error) {
      if (NANO_DEBUG) {
        console.warn('Gemini-style call failed, fallback to image endpoint:', error);
      }
      return generateCardViaImageEndpoint(petImage, templateImage);
    }
  }

  return generateCardViaGemini(petImage, templateImage);
}

export async function POST(request: NextRequest) {
  try {
    if (!NANO_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API Key 未配置' },
        { status: 500 }
      );
    }

    const { petImage } = await request.json();

    if (!petImage) {
      return NextResponse.json(
        { success: false, error: '请上传宠物照片' },
        { status: 400 }
      );
    }

    let templateBase64 = '';
    if (NANO_INCLUDE_TEMPLATE) {
      // 读取扑克牌模板（转换为 base64）
      const templateUrl = new URL('/poker-template.png', request.url);
      const templateResponse = await fetch(templateUrl);
      if (!templateResponse.ok) {
        throw new Error('扑克牌模板读取失败');
      }
      const templateBuffer = await templateResponse.arrayBuffer();
      templateBase64 = `data:image/png;base64,${Buffer.from(templateBuffer).toString('base64')}`;
    }

    // 并行生成 2 张卡片
    const [card1, card2] = await Promise.all([
      generateCard(petImage, templateBase64),
      generateCard(petImage, templateBase64),
    ]);

    return NextResponse.json({
      success: true,
      cards: [card1, card2],
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '生成失败' },
      { status: 500 }
    );
  }
}
