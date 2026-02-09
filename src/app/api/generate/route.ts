import { NextRequest, NextResponse } from 'next/server';

function readEnv(name: string, fallback = ''): string {
  const raw = process.env[name];
  const value = raw == null || raw === '' ? fallback : raw;
  return value.replace(/\r?\n/g, '').trim();
}

const NANO_API_KEY = readEnv('NANOBANANA_API_KEY');
const NANO_BASE_URL = readEnv('NANOBANANA_BASE_URL', 'https://api.mmw.ink').replace(/\/+$/, '');
const NANO_MODEL = readEnv('NANOBANANA_MODEL', '[A]gemini-3-pro-image-preview');
const NANO_API_MODE = readEnv('NANOBANANA_API_MODE', 'gemini').toLowerCase();
const NANO_GEMINI_ENDPOINT_TEMPLATE =
  readEnv('NANOBANANA_GEMINI_ENDPOINT_TEMPLATE', '/v1beta/models/{model}:generateContent');
const NANO_IMAGE_SIZE = readEnv('NANOBANANA_IMAGE_SIZE', '2K');
const NANO_TIMEOUT_MS = Number(readEnv('NANOBANANA_TIMEOUT_MS', '300000'));
const NANO_IMAGE_ENDPOINT = readEnv('NANOBANANA_IMAGE_ENDPOINT', '/v1/images/edits');
const NANO_AUTH_HEADER = readEnv('NANOBANANA_AUTH_HEADER', 'Authorization');
const NANO_AUTH_SCHEME = process.env.NANOBANANA_AUTH_SCHEME == null
  ? 'Bearer'
  : readEnv('NANOBANANA_AUTH_SCHEME');
const NANO_MODEL_FIELD = readEnv('NANOBANANA_MODEL_FIELD', 'model');
const NANO_PROMPT_FIELD = readEnv('NANOBANANA_PROMPT_FIELD', 'prompt');
const NANO_IMAGE_FIELD = readEnv('NANOBANANA_IMAGE_FIELD', 'image');
const NANO_TEMPLATE_IMAGE_FIELD = readEnv('NANOBANANA_TEMPLATE_IMAGE_FIELD', NANO_IMAGE_FIELD);
const NANO_INCLUDE_TEMPLATE = readEnv('NANOBANANA_INCLUDE_TEMPLATE', '1') !== '0';
const NANO_GROUP = readEnv('NANOBANANA_GROUP');
const NANO_EXTRA_HEADERS = readEnv('NANOBANANA_EXTRA_HEADERS');
const NANO_DEBUG = readEnv('NANOBANANA_DEBUG') === '1';

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

// J、Q、K 三张牌的提示词
const PROMPTS = {
  J: `# Role: Master of Traditional Card Cartography & Antique Engraving

# Primary Objective:
Create a VERTICAL (Portrait) custom playing card. You must perform a surgical replacement of the central figure from the base card (image_0.png) with the pet from image_1.png, while strictly adhering to standard playing card layout and orientation.

# 1. Mandatory Canvas & Orientation:
- **Vertical Orientation:** The final output MUST be a vertical (portrait) card, exactly like image_0.png. Do NOT generate a horizontal or landscape layout.
- **Aspect Ratio:** Match the standard tall rectangular proportions of a playing card.

# 2. Strict Index & Corner Logic (The "Two-Corner" Rule):
- **Placement:** Only TWO corners shall contain indices (the Letter and Suit symbol).
    - Top-Left corner: 'J' and 'Heart' in normal upright orientation.
    - Bottom-Right corner: 'J' and 'Heart' rotated 180 degrees (upside down).
- **Negative Constraint:** Do NOT add any indices, symbols, or letters to the top-right or bottom-left corners. Keep them completely blank/white, identical to image_0.png.
- **Consistency:** The font, color (red), and size of these indices must match image_0.png perfectly.

# 3. Subject Replacement & CNY Theme:
- **Central Character:** Replace the Jack with the pet from image_1.png. Maintain exact facial features, fur patterns, and breed characteristics.
- **Double-Headed Symmetry:** Render the pet as a traditional double-headed figure, mirrored vertically along the center line (upright on top, inverted on bottom).
- **Festive CNY Attire:** Dress the pet in authentic Chinese New Year clothing (e.g., a red Tang suit with golden silk embroidery, a dragon-patterned robe, or a traditional festive cap).
- **Pet Identity Preservation:** The pet's fur color, pattern distribution, eye color, ear shape, and facial proportions MUST match image_1.png exactly. Do NOT generate a different breed or "similar-looking" pet.

# 4. Stylistic Integration (Antique Print Style):
- **Art Style:** The entire central figure (pet + clothing) must be rendered in the VINTAGE ENGRAVING / WOODCUT style.
- **Technique:** Use fine black line-art, dense hatching for shadows, and flat, bold color fills (red, blue, yellow) that match the lithographic printing style of image_0.png.
- **Background & Border:** Preserve the original black inner-frame lines and the clean white background/paper texture of image_0.png.

# Final Verification:
Ensure the card is vertical, has only two indices (top-left and bottom-right), and the pet looks like a hand-drawn engraving from the 19th century wearing festive Chinese robes.`,

  Q: `# Role: Master of Traditional Card Cartography & Antique Engraving

# Primary Objective:
Create a VERTICAL (Portrait) custom playing card. You must perform a surgical replacement of the central figure from the base card (image_0.png) with the pet from image_1.png, while strictly adhering to standard playing card layout and orientation.

# 1. Mandatory Canvas & Orientation:
- **Vertical Orientation:** The final output MUST be a vertical (portrait) card, exactly like image_0.png. Do NOT generate a horizontal or landscape layout.
- **Aspect Ratio:** Match the standard tall rectangular proportions of a playing card.

# 2. Strict Index & Corner Logic (The "Two-Corner" Rule):
- **Placement:** Only TWO corners shall contain indices (the Letter and Suit symbol).
    - Top-Left corner: 'Q' and 'Heart' in normal upright orientation.
    - Bottom-Right corner: 'Q' and 'Heart' rotated 180 degrees (upside down).
- **Negative Constraint:** Do NOT add any indices, symbols, or letters to the top-right or bottom-left corners. Keep them completely blank/white, identical to image_0.png.
- **Consistency:** The font, color (red), and size of these indices must match image_0.png perfectly.

# 3. Subject Replacement & CNY Theme:
- **Central Character:** Replace the Queen with the pet from image_1.png. Maintain exact facial features, fur patterns, and breed characteristics.
- **Double-Headed Symmetry:** Render the pet as a traditional double-headed Queen figure, mirrored vertically along the center line (upright on top, inverted on bottom).
- **Festive CNY Attire:** Dress the pet in authentic Chinese New Year royal clothing (e.g., an elegant red and gold embroidered robe, a phoenix-patterned dress, or traditional festive headpiece).
- **Pet Identity Preservation:** The pet's fur color, pattern distribution, eye color, ear shape, and facial proportions MUST match image_1.png exactly. Do NOT generate a different breed or "similar-looking" pet.

# 4. Stylistic Integration (Antique Print Style):
- **Art Style:** The entire central figure (pet + clothing) must be rendered in the VINTAGE ENGRAVING / WOODCUT style.
- **Technique:** Use fine black line-art, dense hatching for shadows, and flat, bold color fills (red, blue, yellow) that match the lithographic printing style of image_0.png.
- **Background & Border:** Preserve the original black inner-frame lines and the clean white background/paper texture of image_0.png.

# Final Verification:
Ensure the card is vertical, has only two indices (top-left and bottom-right), and the pet looks like a hand-drawn engraving from the 19th century wearing festive Chinese royal robes.`,

  K: `# Role: Master of Traditional Card Cartography & Antique Engraving

# Primary Objective:
Create a VERTICAL (Portrait) custom playing card. You must perform a surgical replacement of the central figure from the base card (image_0.png) with the pet from image_1.png, while strictly adhering to standard playing card layout and orientation.

# 1. Mandatory Canvas & Orientation:
- **Vertical Orientation:** The final output MUST be a vertical (portrait) card, exactly like image_0.png. Do NOT generate a horizontal or landscape layout.
- **Aspect Ratio:** Match the standard tall rectangular proportions of a playing card.

# 2. Strict Index & Corner Logic (The "Two-Corner" Rule):
- **Placement:** Only TWO corners shall contain indices (the Letter and Suit symbol).
    - Top-Left corner: 'K' and 'Heart' in normal upright orientation.
    - Bottom-Right corner: 'K' and 'Heart' rotated 180 degrees (upside down).
- **Negative Constraint:** Do NOT add any indices, symbols, or letters to the top-right or bottom-left corners. Keep them completely blank/white, identical to image_0.png.
- **Consistency:** The font, color (red), and size of these indices must match image_0.png perfectly.

# 3. Subject Replacement & CNY Theme:
- **Central Character:** Replace the King with the pet from image_1.png. Maintain exact facial features, fur patterns, and breed characteristics.
- **Double-Headed Symmetry:** Render the pet as a traditional double-headed King figure, mirrored vertically along the center line (upright on top, inverted on bottom).
- **Festive CNY Attire:** Dress the pet in authentic Chinese New Year royal clothing (e.g., a red Tang suit with golden silk embroidery, a dragon-patterned imperial robe, or a traditional festive crown).
- **Pet Identity Preservation:** The pet's fur color, pattern distribution, eye color, ear shape, and facial proportions MUST match image_1.png exactly. Do NOT generate a different breed or "similar-looking" pet.

# 4. Stylistic Integration (Antique Print Style):
- **Art Style:** The entire central figure (pet + clothing) must be rendered in the VINTAGE ENGRAVING / WOODCUT style.
- **Technique:** Use fine black line-art, dense hatching for shadows, and flat, bold color fills (red, blue, yellow) that match the lithographic printing style of image_0.png.
- **Background & Border:** Preserve the original black inner-frame lines and the clean white background/paper texture of image_0.png.

# Final Verification:
Ensure the card is vertical, has only two indices (top-left and bottom-right), and the pet looks like a hand-drawn engraving from the 19th century wearing festive Chinese royal robes.`,
};

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

function getModelCandidates(): string[] {
  const candidates = [NANO_MODEL];

  // Some providers expose aliases like "[A]model-name" while some keys only
  // work with the raw model name.
  const aliasStripped = NANO_MODEL.replace(/^\[[^\]]+\]\s*/, '');
  if (aliasStripped && aliasStripped !== NANO_MODEL) {
    candidates.push(aliasStripped);
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const normalized = candidate.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

function resolveGeminiEndpointPath(model: string): string {
  if (NANO_GEMINI_ENDPOINT_TEMPLATE.includes('{model}')) {
    return NANO_GEMINI_ENDPOINT_TEMPLATE.replace('{model}', encodeURIComponent(model));
  }
  return NANO_GEMINI_ENDPOINT_TEMPLATE;
}

function getGeminiEndpointCandidates(model: string): string[] {
  const encodedModel = encodeURIComponent(model);
  const candidates = [
    resolveGeminiEndpointPath(model),
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

// 从响应中解析纯文本内容
function parseTextFromResponse(rawData: unknown): string | null {
  const data = rawData as ApiResponsePayload;
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const texts: string[] = [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.trim().length > 0) {
        texts.push(part.text.trim());
      }
    }
  }

  return texts.length > 0 ? texts.join('\n') : null;
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

// 生成扑克牌（使用固定提示词）
async function generateCardViaGemini(
  petImage: string,
  templateImage: string,
  rank: 'J' | 'Q' | 'K'
): Promise<string> {
  const pet = parseDataUrl(petImage);
  const prompt = PROMPTS[rank];

  const parts: GeminiRequestPart[] = [
    { text: prompt },
  ];

  // 模板图片在前（第一张图片）
  if (NANO_INCLUDE_TEMPLATE) {
    const template = parseDataUrl(templateImage);
    parts.push({
      inlineData: {
        mimeType: template.mimeType,
        data: template.base64Data,
      },
    });
  }

  // 宠物照片在后（第二张图片）
  parts.push({
    inlineData: {
      mimeType: pet.mimeType,
      data: pet.base64Data,
    },
  });

  const requestBody: GeminiGenerateRequestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { imageSize: NANO_IMAGE_SIZE.toUpperCase() },
    },
  };

  const endpointErrors: string[] = [];
  for (const model of getModelCandidates()) {
    const endpointCandidates = getGeminiEndpointCandidates(model);
    for (const endpointPath of endpointCandidates) {
      const endpoint = `${NANO_BASE_URL}${endpointPath}`;
      if (NANO_DEBUG) {
        console.log('Gemini-style request', {
          endpoint,
          model,
          apiMode: NANO_API_MODE,
        });
      }

      try {
        const data = await fetchWithAuthFallback(endpoint, JSON.stringify(requestBody), 'application/json');
        const result = parseImageFromResponse(data);
        if (result) return result;
        endpointErrors.push(`模型 ${model}: 响应成功但无法解析图片: ${endpointPath}`);
      } catch (error) {
        endpointErrors.push(`模型 ${model} ${endpointPath} => ${error instanceof Error ? error.message : '请求失败'}`);
      }
    }
  }

  throw new Error(`Gemini 接口调用失败: ${endpointErrors.join(' | ')}`);
}

async function generateCardViaImageEndpoint(
  petImage: string,
  templateImage: string,
  rank: 'J' | 'Q' | 'K'
): Promise<string> {
  const prompt = PROMPTS[rank];
  const endpoint = `${NANO_BASE_URL}${NANO_IMAGE_ENDPOINT}`;
  const errors: string[] = [];

  for (const model of getModelCandidates()) {
    const formData = new FormData();
    formData.append(NANO_MODEL_FIELD, model);
    formData.append(NANO_PROMPT_FIELD, prompt);
    formData.append(NANO_IMAGE_FIELD, dataUrlToBlob(petImage), 'pet.png');
    if (NANO_INCLUDE_TEMPLATE) {
      formData.append(NANO_TEMPLATE_IMAGE_FIELD, dataUrlToBlob(templateImage), 'template.png');
    }

    if (NANO_DEBUG) {
      console.log('Nano Banana request', {
        endpoint,
        model,
        hasGroup: Boolean(NANO_GROUP),
        apiMode: NANO_API_MODE,
      });
    }

    try {
      const data = await fetchWithAuthFallback(endpoint, formData);
      const result = parseImageFromResponse(data);
      if (result) return result;
      errors.push(`模型 ${model}: 响应成功但无法解析图片`);
    } catch (error) {
      errors.push(`模型 ${model} => ${error instanceof Error ? error.message : '请求失败'}`);
    }
  }

  throw new Error(`图像接口调用失败: ${errors.join(' | ')}`);
}

async function generateCard(
  petImage: string,
  templateImage: string,
  rank: 'J' | 'Q' | 'K'
): Promise<string> {
  if (NANO_API_MODE === 'openai-images') {
    return generateCardViaImageEndpoint(petImage, templateImage, rank);
  }

  if (NANO_API_MODE === 'auto') {
    try {
      return await generateCardViaGemini(petImage, templateImage, rank);
    } catch (error) {
      if (NANO_DEBUG) {
        console.warn('Gemini-style call failed, fallback to image endpoint:', error);
      }
      return generateCardViaImageEndpoint(petImage, templateImage, rank);
    }
  }

  return generateCardViaGemini(petImage, templateImage, rank);
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

    // 读取 J、Q、K 三个模板
    const templateNames = [
      { name: 'poker-template-j.png', rank: 'J' as const },
      { name: 'poker-template-q.png', rank: 'Q' as const },
      { name: 'poker-template-k.png', rank: 'K' as const },
    ];
    const templates: Array<{ base64: string; rank: 'J' | 'Q' | 'K' }> = [];

    if (NANO_INCLUDE_TEMPLATE) {
      for (const { name, rank } of templateNames) {
        const templateUrl = new URL(`/${name}`, request.url);
        const templateResponse = await fetch(templateUrl);
        if (!templateResponse.ok) {
          throw new Error(`模板 ${name} 读取失败`);
        }
        const templateBuffer = await templateResponse.arrayBuffer();
        templates.push({
          base64: `data:image/png;base64,${Buffer.from(templateBuffer).toString('base64')}`,
          rank,
        });
      }
    }

    // 生成 3 张卡片（J、Q、K 各一张）
    if (NANO_DEBUG) {
      console.log('Generating 3 cards (J, Q, K)...');
    }
    const [cardJ, cardQ, cardK] = await Promise.all([
      generateCard(petImage, templates[0].base64, templates[0].rank),
      generateCard(petImage, templates[1].base64, templates[1].rank),
      generateCard(petImage, templates[2].base64, templates[2].rank),
    ]);

    return NextResponse.json({
      success: true,
      cards: [cardJ, cardQ, cardK],
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '生成失败' },
      { status: 500 }
    );
  }
}
