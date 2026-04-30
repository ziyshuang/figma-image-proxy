export default async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 从环境变量读取 Pexels Key（AUTH_TOKEN 暂不用）
  const PEXELS_API_KEY = env.PEXELS_API_KEY;

  // 获取搜索关键词
  const query = url.searchParams.get('query') || 'nature';

  try {
    const pexelsResponse = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!pexelsResponse.ok) {
      return new Response(JSON.stringify({ error: 'Pexels API error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const data = await pexelsResponse.json();
    const photos = data.photos;
    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ error: 'No images' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const imageUrl = photos[0].src.large;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: 'Image fetch failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(imageResponse.body, {
      status: 200,
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
