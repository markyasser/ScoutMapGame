import { Redis } from '@upstash/redis'

const KEY = 'scoutgame:app-snapshot-v1'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VercelRequest = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VercelResponse = any

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return Redis.fromEnv()
}

function parseJsonBody(req: VercelRequest): unknown {
  const b = req.body
  if (b == null) return null
  if (typeof b === 'string') {
    try {
      return JSON.parse(b) as unknown
    } catch {
      return null
    }
  }
  return b
}

/**
 * Public game snapshot: GET returns JSON or null, PUT/POST sets whole blob.
 * Add a Redis store from the Vercel marketplace (e.g. Upstash) — no auth on this sample.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    res.status(204)
    return res.end()
  }

  const redis = getRedis()
  if (!redis) {
    return res.status(501).json({
      error: 'Redis not configured',
      hint: 'Add an Upstash Redis integration (Vercel → Storage) and redeploy so UPSTASH_REDIS_* env vars are set.',
    })
  }

  try {
    if (req.method === 'GET') {
      const raw = await redis.get<string>(KEY)
      if (raw == null) {
        return res.status(200).json(null)
      }
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return res.status(200).json(data)
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = parseJsonBody(req)
      if (body == null || typeof body !== 'object') {
        return res.status(400).json({ error: 'Expected JSON object body' })
      }
      const u = (body as { updatedAt?: unknown }).updatedAt
      if (typeof u !== 'number' || u <= 0) {
        return res.status(400).json({ error: 'Body must include positive numeric updatedAt' })
      }
      await redis.set(KEY, JSON.stringify(body))
      return res.status(200).json({ ok: true })
    }
  } catch (e) {
    console.error('[api/snapshot]', e)
    return res.status(500).json({ error: 'Server error' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
