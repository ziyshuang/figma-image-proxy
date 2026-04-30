// edge-functions/api/get-image.js

export default async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // ------------------------------------------------------------
  // 1. 从环境变量中读取密钥和校验 Token
  //    这些值会在 EdgeOne 控制台进行配置，绝不硬编码在代码里
  // ------------------------------------------------------------
  const PEXELS_API_KEY = env.PEXELS_API_KEY;   // 你的 Pexels API Key
  const AUTH_TOKEN = env.AUTH_TOKEN || 'my-secret'; // 自定义鉴权 Token

  // 2. 安全校验：检查 URL 中携带的 token 是否匹配
  const token = url.searchParams.get('token');
  if (!token || token !== AUTH_TOKEN) {
    return new Response(JSON.stringify({ error: 'Forbidden: Invalid token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. 获取搜索关键词，默认为 'nature'
  const query = url.searchParams.get('query') || 'nature';

  // ------------------------------------------------------------
  // 4. 调用 Pexels API 搜索一张图片
  // ------------------------------------------------------------
  try {
    const pexelsResponse = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!pexelsResponse.ok) {
      console.error(`Pexels API Error: ${pexelsResponse.status}`);
      return new Response(JSON.stringify({ error: `Pexels API Error: ${pexelsResponse.status}` }), {
        status: pexelsResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await pexelsResponse.json();
    const photos = data.photos;

    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ error: 'No images found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 选择 "large" 尺寸，通常在 940x650 左右，远小于 Figma 的 4096px 限制
    const imageUrl = photos[0].src.large;

    // ------------------------------------------------------------
    // 5. 下载图片并将二进制数据返回给 Figma
    // ------------------------------------------------------------
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image from Pexels CDN: ${imageResponse.status}`);
      return new Response(JSON.stringify({ error: 'Failed to download image' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 创建新的响应，添加允许跨域头（Figma 插件需要）
    return new Response(imageResponse.body, {
      status: 200,
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
        'Access-Control-Allow-Origin': '*',  // 允许 Figma 客户端跨域访问
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Internal Server Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
