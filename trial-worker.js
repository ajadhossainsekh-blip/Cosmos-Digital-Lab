// Cloudflare Worker – server-side 24h trial tracker (by IP + device id)
// Setup: create a KV namespace, bind it to this Worker with the variable name TRIALS,
// deploy, then paste the Worker URL into  api:"" inside the protected HTML.
export default {
  async fetch(req, env) {
    const h = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    const u = new URL(req.url);
    const ip = req.headers.get('CF-Connecting-IP') || '';
    const id = (u.searchParams.get('id') || '').replace(/[^a-f0-9]/gi, '').slice(0, 40);
    const keys = [];
    if (ip) keys.push('ip:' + ip);
    if (id) keys.push('id:' + id);
    const found = await Promise.all(keys.map(k => env.TRIALS.get(k)));
    const seen = found.filter(Boolean).map(Number);
    const now = Date.now();
    let start = seen.length ? Math.min(...seen) : null;
    if (start === null && u.searchParams.get('start')) start = now;
    if (start !== null) {
      // remember the SAME start time under both the IP and the device id
      await Promise.all(keys.map((k, i) => found[i] ? null : env.TRIALS.put(k, String(start))));
    }
    return new Response(JSON.stringify({ start, now }), { headers: h });
  }
};
