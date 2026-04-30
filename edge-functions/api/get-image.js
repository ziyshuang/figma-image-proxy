export default async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 从环境变量读取密钥
  const PEXELS_API_KEY = env.PEXELS_API_KEY;
  const AUTH_TOKEN = env.AUTH_TOKEN || 'my-secret';

  // ⚠️ 辅助函数：快速生成带 CORS 头的响应
  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',   // 关键！所有响应都必须包含
        'Cache-Control': 'no-cache'
      }
    });
  }

  // 1. Token 校验
  const token = url.searchParams.get('token');
  if (!token || token !== AUTH_TOKEN) {
    return jsonResponse({ error: 'Forbidden: Invalid token' }, 403);
  }

  // 2. 获取搜索关键词
  const query = url.searchParams.get('query') || 'nature';

  try {
    // 3. 调用 Pexels API
    const pexelsResponse = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!pexelsResponse.ok) {
      console.error(`Pexels API Error: ${pexelsResponse.status}`);
      return jsonResponse({ error: `Pexels API Error: ${pexelsResponse.status}` }, 502);
    }

    const data = await pexelsResponse.json();
    const photos = data.photos;

    if (!photos || photos.length === 0) {
      return jsonResponse({ error: 'No images found' }, 404);
    }

    // 4. 获取图片二进制内容
    const imageUrl = photos[0].src.large;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return jsonResponse({ error: 'Failed to download image' }, 502);
    }

    // 5. 返回图片，并附加 CORS 头
    return new Response(imageResponse.body, {
      status: 200,
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Internal Server Error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
