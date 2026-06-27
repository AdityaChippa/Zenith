import { NextResponse } from 'next/server';

/** Fetch with a hard timeout. Throws on timeout or network error. */
export async function timedFetch(url: string, ms = 5000, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } finally {
    clearTimeout(id);
  }
}

export function ok<T>(data: T, fallback: boolean) {
  return NextResponse.json(
    { data, fallback, at: Date.now() },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}

export const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
