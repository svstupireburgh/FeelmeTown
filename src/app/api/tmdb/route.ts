import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache with expiration
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchWithFallback(url: string, token: string | undefined, v3Key: string | undefined) {
  // First attempt: v4 Bearer token
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined as any,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5s to avoid hanging server
      next: { revalidate: 3600 } // Use Next.js built-in cache
    });
    if (r.ok) return r;
    // If unauthorized or other error, fall through to v3
    if (r.status === 401 || r.status === 403) throw new Error(`TMDB v4 auth failed: ${r.status}`);
  } catch (err) {
    // Continue to v3 fallback on network/timeout/auth errors
    // 
  }

  // Second attempt: v3 api_key query param if available
  if (v3Key) {
    const separator = url.includes('?') ? '&' : '?';
    const v3Url = `${url}${separator}api_key=${encodeURIComponent(v3Key)}`;
    const r2 = await fetch(v3Url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 } // Use Next.js built-in cache
    });
    return r2;
  }

  // If no v3 key, throw to be handled by caller
  throw new Error('TMDB request failed and no v3 API key available');
}

export async function GET(request: NextRequest) {
  try {
    const token = process.env.TMDB_READ_ACCESS_TOKEN;
    const v3Key = process.env.TMDB_V3_API_KEY;

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const language = searchParams.get('language') || 'en-US';
    const query = searchParams.get('query') || '';
    const year = searchParams.get('year') || '';
    const genre = searchParams.get('genre') || ''; // TMDB genre id
    const region = searchParams.get('region') || ''; // e.g., IN
    const wol = searchParams.get('wol') || ''; // with_original_language, e.g., hi/te/ta/ml/kn/mr/pa/bn
    const sortBy = searchParams.get('sortBy') || 'popularity.desc'; // Default sort by popularity
    
    // Get current year for filtering
    const currentYear = new Date().getFullYear();
    
    // Create cache key from all parameters
    const cacheKey = `tmdb-${query}-${year}-${genre}-${region}-${wol}-${language}-${page}-${sortBy}-${currentYear}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      
      return NextResponse.json(cachedData);
    }

    let url: string;

    if (query) {
      const params = new URLSearchParams({
        language,
        page,
        include_adult: 'false',
        query,
        'primary_release_date.lte': `${currentYear}-12-31`, // Limit to current year and earlier
      });
      if (year) params.set('year', year);
      if (region) params.set('region', region);
      url = `https://api.themoviedb.org/3/search/movie?${params.toString()}`;
    } else {
      // Use the requested sort order or default to newest first
      const params = new URLSearchParams({
        language,
        page,
        sort_by: 'primary_release_date.desc', // Always show newest movies first
        include_adult: 'false',
        include_video: 'false',
        'primary_release_date.lte': `${currentYear}-12-31`, // Limit to current year and earlier
      });
      if (region) params.set('region', region);
      if (year) params.set('primary_release_year', year);
      if (genre) params.set('with_genres', genre);
      if (wol) params.set('with_original_language', wol);
      url = `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
    }

    
    const r = await fetchWithFallback(url, token, v3Key);

    if (!r.ok) {
      let detail: unknown = null;
      try { detail = await r.clone().json(); } catch {}
      const text = detail || (await r.text());
      
      return NextResponse.json({ results: [], error: 'TMDB error', detail: text }, { status: r.status });
    }

    const data = await r.json();
    
    // Store in cache
    setCachedData(cacheKey, data);
    
    return NextResponse.json(data);
  } catch (e: unknown) {
    
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ results: [], error: 'Server error', detail: errorMessage }, { status: 500 });
  }
}

