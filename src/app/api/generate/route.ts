import { NextRequest, NextResponse } from 'next/server';

const NANO_API_KEY = process.env.NANOBANANA_API_KEY?.trim();
const NANO_BASE_URL = (process.env.NANOBANANA_BASE_URL || 'https://image.glmbigmodel.me').replace(/\/+$/, '');
const NANO_MODEL = process.env.NANOBANANA_MODEL || 'nanobananapro';
const NANO_IMAGE_ENDPOINT = process.env.NANOBANANA_IMAGE_ENDPOINT || '/v1/images/edits';
const NANO_AUTH_HEADER = process.env.NANOBANANA_AUTH_HEADER || 'Authorization';
const NANO_AUTH_SCHEME = process.env.NANOBANANA_AUTH_SCHEME ?? 'Bearer';
const NANO_GROUP = process.env.NANOBANANA_GROUP;
const NANO_EXTRA_HEADERS = process.env.NANOBANANA_EXTRA_HEADERS;
const NANO_DEBUG = process.env.NANOBANANA_DEBUG === '1';

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

async function generateCard(petImage: string, templateImage: string): Promise<string> {
  const formData = new FormData();
  formData.append('model', NANO_MODEL);
  formData.append('prompt', PROMPT);
  formData.append('image', dataUrlToBlob(petImage), 'pet.png');
  formData.append('image', dataUrlToBlob(templateImage), 'template.png');

  const headers: Record<string, string> = {};
  if (NANO_AUTH_HEADER) {
    headers[NANO_AUTH_HEADER] = NANO_AUTH_SCHEME
      ? `${NANO_AUTH_SCHEME} ${NANO_API_KEY}`
      : `${NANO_API_KEY}`;
  }
  if (NANO_GROUP) {
    headers['X-Group'] = NANO_GROUP;
  }
  if (NANO_EXTRA_HEADERS) {
    try {
      const parsed = JSON.parse(NANO_EXTRA_HEADERS) as Record<string, string>;
      Object.assign(headers, parsed);
    } catch {
      throw new Error('NANOBANANA_EXTRA_HEADERS 不是有效的 JSON');
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);

  if (NANO_DEBUG) {
    console.log('Nano Banana request', {
      endpoint: `${NANO_BASE_URL}${NANO_IMAGE_ENDPOINT}`,
      model: NANO_MODEL,
      hasGroup: Boolean(NANO_GROUP),
    });
  }

  const response = await fetch(`${NANO_BASE_URL}${NANO_IMAGE_ENDPOINT}`, {
    method: 'POST',
    headers,
    body: formData,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Nano Banana API error:', errorText);
    throw new Error(`API 调用失败: ${response.status}`);
  }

  const data = await response.json();

  const first = data?.data?.[0];
  if (first?.url) {
    return first.url;
  }
  if (first?.b64_json) {
    return `data:image/png;base64,${first.b64_json}`;
  }

  console.error('Unexpected response format:', JSON.stringify(data, null, 2));
  throw new Error('无法解析生成的图片');
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

    // 读取扑克牌模板（转换为 base64）
    const templateUrl = new URL('/poker-template.png', request.url);
    const templateResponse = await fetch(templateUrl);
    const templateBuffer = await templateResponse.arrayBuffer();
    const templateBase64 = `data:image/png;base64,${Buffer.from(templateBuffer).toString('base64')}`;

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
