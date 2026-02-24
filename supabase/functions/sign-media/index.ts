// Supabase Edge Function: sign-media
// Purpose: mint signed URLs (private bucket) for media referenced in DB.
// Security model (public feed):
// - Request can be anonymous.
// - Function only signs paths that exist in public.post_media table.
// - Rate limits are basic (per request item cap). Consider adding IP rate limit at the edge.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReqItem = { bucket: string; path: string };

type SignedItem = {
  bucket: string;
  path: string;
  signedUrl: string | null;
  expiresIn: number;
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
    ...init,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        // supabase-js adds x-client-info header
        "access-control-allow-headers": "content-type, authorization, apikey, x-client-info",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, { status: 405 });
  }

  // Env resolution:
  // Prefer PLUTOSO_* names, but also support SUPABASE_* names (some CLI versions block setting SUPABASE_*;
  // however the project may already have them set).
  const SUPABASE_URL = Deno.env.get("PLUTOSO_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("PLUTOSO_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "missing_env" }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const items: ReqItem[] = Array.isArray(body?.items) ? body.items : [];
  const expiresIn = Number(body?.expiresIn ?? 300);

  if (!items.length) {
    return json({ items: [] as SignedItem[] }, { status: 200, headers: corsHeaders() });
  }

  if (items.length > 20) {
    return json({ error: "too_many_items", max: 20 }, { status: 400, headers: corsHeaders() });
  }

  // Clamp expiry 60s..600s (1..10 minutes)
  const exp = Math.max(60, Math.min(600, expiresIn));

  // Service-role client (server-side only).
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Verify requested paths exist in DB (prevents signing arbitrary bucket objects).
  // Note: this is a simple membership check. For stricter model, join to posts visibility.
  const keySet = new Set(items.map((it) => `${it.bucket}::${it.path}`));

  const paths = items.map((it) => it.path);
  const buckets = items.map((it) => it.bucket);

  // Query by path/bucket; we fetch all matches then filter.
  const { data: rows, error: qErr } = await admin
    .from("post_media")
    .select("bucket,path")
    .in("path", paths)
    .in("bucket", buckets);

  if (qErr) {
    return json({ error: "db_query_failed", details: qErr.message }, { status: 500, headers: corsHeaders() });
  }

  const allowed = new Set((rows ?? []).map((r: any) => `${r.bucket}::${r.path}`));

  const out: SignedItem[] = [];
  for (const it of items) {
    const k = `${it.bucket}::${it.path}`;
    if (!allowed.has(k) || !keySet.has(k)) {
      out.push({ bucket: it.bucket, path: it.path, signedUrl: null, expiresIn: exp });
      continue;
    }

    const { data, error } = await admin.storage.from(it.bucket).createSignedUrl(it.path, exp);
    if (error) {
      out.push({ bucket: it.bucket, path: it.path, signedUrl: null, expiresIn: exp });
      continue;
    }
    out.push({ bucket: it.bucket, path: it.path, signedUrl: data?.signedUrl ?? null, expiresIn: exp });
  }

  return json({ items: out }, { status: 200, headers: corsHeaders() });
});

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization, apikey, x-client-info",
  };
}
