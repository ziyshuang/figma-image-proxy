// edge-functions/api/get-image.js

// 你的Pexels API Key，我们稍后会通过环境变量安全注入
const PEXELS_API_KEY = 'YOUR_PEXELS_API_KEY';

export default async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // --- 1. 安全校验 ---
  const token = url.searchParams.get('token');
  const AUTH_TOKEN = env.AUTH_TOKEN || 'my-secret'; 

  if (token !== AUTH_TOKEN) {
    return new Response(JSON.stringify({ error: 'Forbidden: Invalid token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- 2. 获取查询参数 ---
  const query = url.searchParams.get('query') || 'nature'; 

  // --- 3. 调用 Pexels API ---
  try {
    const pexelsResponse = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    if (!pexelsResponse.ok) {
      const errorBody = await pexelsResponse.text();
      console.error(`Pexels API Error: ${pexelsResponse.status} ${errorBody}`);
      return new Response(JSON.stringify({ error: `Pexels API Error: ${pexelsResponse.status}` }), {
        status: pexelsResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pexelsData = await pexelsResponse.json();
    const photos = pexelsData.photos;

    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ error: 'No images found for the given query' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const imageUrl = photos[0].src.large; 
    
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image from Pexels CDN: ${imageResponse.status}`);
      return new Response(JSON.stringify({ error: 'Failed to fetch image from Pexels CDN' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = new Response(imageResponse.body, {
      status: 200,
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });

    return response;

  } catch (error) {
    console.error('Internal Server Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
