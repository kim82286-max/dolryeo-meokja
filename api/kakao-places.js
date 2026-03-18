// api/kakao-places.js
// Vercel Serverless Function — 카카오 로컬 API 프록시
// 프론트엔드 → 이 함수 → 카카오 API → 결과 반환

export default async function handler(req, res) {
  // CORS 허용
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

  if (!KAKAO_REST_API_KEY) {
    return res.status(500).json({ error: "KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다." });
  }

  const { type, x, y, radius, category_group_code, query, page, size } = req.query;

  try {
    let url;
    const params = new URLSearchParams();

    if (type === "category") {
      // 카테고리 검색: FD6(음식점), CE7(카페)
      url = "https://dapi.kakao.com/v2/local/search/category.json";
      params.append("category_group_code", category_group_code || "FD6");
      params.append("x", x);
      params.append("y", y);
      params.append("radius", radius || "500");
      params.append("sort", "distance");
      params.append("page", page || "1");
      params.append("size", size || "15");
    } else if (type === "keyword") {
      // 키워드 검색: "왕십리역" 같은 장소 검색
      url = "https://dapi.kakao.com/v2/local/search/keyword.json";
      params.append("query", query);
      if (x && y) {
        params.append("x", x);
        params.append("y", y);
        if (radius) params.append("radius", radius);
        params.append("sort", "distance");
      } else {
        params.append("sort", "accuracy");
      }
      params.append("page", page || "1");
      params.append("size", size || "15");
    } else {
      return res.status(400).json({ error: "type은 'category' 또는 'keyword'여야 합니다." });
    }

    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
