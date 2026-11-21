// minimal in-memory supabase-js mock
export type SupabaseClient = any;
export const DB: Record<string, any[]> = { tg_warns: [], tg_bot_messages: [], tg_political_strikes: [], tg_schedule: [], tg_reading: [], tg_bot_settings: [] };
let seq = 1;
const PK: Record<string, string[]> = { tg_warns: ["chat_id", "user_id"], tg_reading: ["chat_id", "user_id", "day"] };

class Q {
  t: string; filters: ((r: any) => boolean)[] = []; op = "select"; payload: any; opts: any = {}; lim = 1e9; single = false; ret = false; ord: any = null;
  constructor(t: string) { this.t = t; }
  select(_c?: string, o?: any) { if (this.op === "select") this.opts = o ?? {}; else this.ret = true; return this; }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this; }
  gte(c: string, v: any) { this.filters.push((r) => r[c] >= v); return this; }
  lte(c: string, v: any) { this.filters.push((r) => r[c] <= v); return this; }
  in(c: string, v: any[]) { this.filters.push((r) => v.includes(r[c])); return this; }
  order(c: string, o: any) { this.ord = [c, o?.ascending !== false]; return this; }
  limit(n: number) { this.lim = n; return this; }
  maybeSingle() { this.single = true; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  upsert(p: any) { this.op = "upsert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  then(res: any, rej: any) { return Promise.resolve(this.run()).then(res, rej); }
  run() {
    const T = DB[this.t];
    const m = (r: any) => this.filters.every((f) => f(r));
    if (this.op === "select") {
      let rows = T.filter(m);
      if (this.ord) rows.sort((a, b) => (a[this.ord[0]] < b[this.ord[0]] ? -1 : 1) * (this.ord[1] ? 1 : -1));
      rows = rows.slice(0, this.lim);
      if (this.opts.head) return { data: null, count: rows.length, error: null };
      return { data: this.single ? rows[0] ?? null : rows, error: null };
    }
    if (this.op === "insert") {
      const row = { id: seq++, created_at: new Date().toISOString(), attempts: 0, ...this.payload };
      if (this.t === "tg_schedule" && row.dedupe_key && T.some((r) => r.dedupe_key === row.dedupe_key)) {
        return { data: null, error: { code: "23505", message: "dup" } };
      }
      T.push(row);
      return { data: this.single ? { id: row.id } : [row], error: null };
    }
    if (this.op === "upsert") {
      const k = PK[this.t];
      const ex = T.find((r) => k.every((c) => r[c] === this.payload[c]));
      if (ex) Object.assign(ex, this.payload); else T.push({ count: 0, ad_count: 0, ...this.payload });
      return { error: null };
    }
    if (this.op === "update") { T.filter(m).forEach((r) => Object.assign(r, this.payload)); return { error: null }; }
    if (this.op === "delete") { DB[this.t] = T.filter((r) => !m(r)); return { error: null }; }
  }
}
export function createClient(_u: string, _k: string) {
  return {
    from: (t: string) => new Q(t),
    rpc: async (_n: string, _a: any) => { if (_n === "tg_get_cron_secret") return { data: "vault_cron", error: null };
      const now = new Date();
      const due = DB.tg_schedule.filter((r) => !r.sent_at && new Date(r.send_at) <= now && new Date(r.send_at).getTime() > now.getTime() - 30 * 60e3 && r.attempts < 3 && !r.claimed_at);
      due.forEach((r) => { r.claimed_at = now.toISOString(); r.attempts++; });
      return { data: due, error: null };
    },
  };
}
