// api/naver-blog.js
// Vercel Serverless Function — 네이버 블로그 검색 API 프록시
// 가게명으로 블로그 검색 → 결과 수로 맛집 검증

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return res.status(500).json({ error: "네이버 API 키가 설정되지 않았습니다." });
  }

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: "query 파라미터가 필요합니다." });
  }

  try {
    const searchQuery = encodeURIComponent(query + " 맛집");
    const response = await fetch(
      `https://openapi.naver.com/v1/search/blog.json?query=${searchQuery}&display=1&sort=sim`,
      {
        headers: {
          "X-Naver-Client-Id": NAVER_CLIENT_ID,
          "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.status(200).json({
      query: query,
      totalBlogs: data.total || 0,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
