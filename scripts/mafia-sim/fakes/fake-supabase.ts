/**
 * قاعدة بيانات وهمية في الذاكرة تقلّد Supabase (PostgREST) بالقدر اللي يستخدمه actions/mafia.ts،
 * عشان المحاكي يشغّل كود اللعبة الحقيقي نفسه (مو نسخة منه) بدون أي اتصال بقاعدة حقيقية.
 *
 * تقلّد: الجداول الخمسة وقيودها (المفاتيح الأساسية، الفريدة، الحذف المتسلسل)، والقيم الافتراضية،
 * والمرشّحات (eq/neq/in/is/gt/lt/or ومسارات JSON مثل night_ready->>lastSeat)، و upsert بـ onConflict،
 * و select مع count/head، و single/maybeSingle، ورموز الأخطاء 23505 و PGRST116.
 *
 * كل عملية تنتظر "دورة" (setTimeout 0) عشان الطلبات المتزامنة من أجهزة مختلفة تتداخل مثل الواقع،
 * وتقدر تضيف تأخير عشوائي أكبر لاستفزاز سباقات التزامن.
 */
import { randomUUID } from "node:crypto";

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

export interface FakeDbOptions {
  /** أقصى تأخير عشوائي (ملي ثانية حقيقية) لكل عملية — 0 = دورة واحدة بس */
  maxLatencyMs?: number;
  /** مصدر العشوائية للتأخير (ما يأثر على اللعبة نفسها) */
  random?: () => number;
  /**
   * دورات إضافية عشوائية (0 لين هذا العدد) لكل عملية — يخلط ترتيب الطلبات المتزامنة بدون تأخير حقيقي
   * (مؤقتات Windows بطيئة، والدورات سريعة)
   */
  jitterTurns?: number;
}

interface TableDef {
  pk: string[];
  uniques: string[][];
  defaults: () => Row;
}

const nowIso = () => new Date(Date.now()).toISOString();

const TABLES: Record<string, TableDef> = {
  mafia_rooms: {
    pk: ["room_code"],
    uniques: [],
    defaults: () => ({
      host_player_id: null,
      phase: "lobby",
      night_step: null,
      night_number: 0,
      phase_seq: 0,
      phase_ends_at: null,
      settings: {},
      announcements: [],
      vote_counts: {},
      vote_result: null,
      winner: null,
      final_roles: null,
      vote_voters: null,
      night_ready: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    }),
  },
  mafia_players: {
    pk: ["id"],
    uniques: [["room_code", "display_name"]],
    defaults: () => ({ id: randomUUID(), is_alive: true, is_bot: false, joined_at: nowIso() }),
  },
  mafia_secrets: {
    pk: ["player_id"],
    uniques: [["token"]],
    defaults: () => ({
      role: null,
      original_role: null,
      soldier_shield_used: false,
      ability_used: false,
      suicide_target: null,
      last_protected: null,
      notes: [],
    }),
  },
  mafia_actions: {
    pk: ["id"],
    uniques: [["room_code", "night", "step", "actor_id"]],
    defaults: () => ({ id: randomUUID(), target_id: null, confirmed_by: [], created_at: nowIso() }),
  },
  mafia_votes: {
    pk: ["room_code", "round", "voter_id"],
    uniques: [],
    defaults: () => ({ target_id: null, created_at: nowIso() }),
  },
};

/** الحذف المتسلسل: لو انحذف صف من الجدول الأول، تنحذف الصفوف اللي تشير له */
const CASCADES: { parent: string; parentKey: string; child: string; childKey: string }[] = [
  { parent: "mafia_rooms", parentKey: "room_code", child: "mafia_players", childKey: "room_code" },
  { parent: "mafia_rooms", parentKey: "room_code", child: "mafia_secrets", childKey: "room_code" },
  { parent: "mafia_rooms", parentKey: "room_code", child: "mafia_actions", childKey: "room_code" },
  { parent: "mafia_rooms", parentKey: "room_code", child: "mafia_votes", childKey: "room_code" },
  { parent: "mafia_players", parentKey: "id", child: "mafia_secrets", childKey: "player_id" },
  { parent: "mafia_players", parentKey: "id", child: "mafia_actions", childKey: "actor_id" },
  { parent: "mafia_players", parentKey: "id", child: "mafia_actions", childKey: "target_id" },
  { parent: "mafia_players", parentKey: "id", child: "mafia_votes", childKey: "voter_id" },
  { parent: "mafia_players", parentKey: "id", child: "mafia_votes", childKey: "target_id" },
];

// data بنوع any مثل supabase-js بدون أنواع الجداول (الكود الحقيقي يتعامل معها كذا)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface FakeResult<T = any> {
  data: T;
  error: { code: string; message: string; details?: string } | null;
  count: number | null;
}

/** يقرا قيمة عمود أو مسار JSON (night_ready->>lastSeat أو night_ready->done) */
function readPath(row: Row, col: string): { value: unknown; text: boolean } {
  if (!col.includes("->")) return { value: row[col], text: false };
  const parts = col.split(/->>?/);
  const text = col.includes("->>");
  let v: unknown = row[parts[0]];
  for (const p of parts.slice(1)) {
    if (v === null || v === undefined || typeof v !== "object") return { value: null, text };
    v = (v as Row)[p];
  }
  if (v === undefined) v = null;
  if (text && v !== null) v = typeof v === "object" ? JSON.stringify(v) : String(v);
  return { value: v, text };
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a), sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

export class QueryError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class FakeSupabase {
  tables: Record<string, Row[]> = Object.fromEntries(Object.keys(TABLES).map((t) => [t, []]));
  /** عدد العمليات لكل نوع (للقياس) */
  stats = { select: 0, insert: 0, update: 0, upsert: 0, delete: 0 };
  /** سجل الكتابات (للفحص): الجدول والنوع وعدد الصفوف */
  writes: { table: string; op: string; rows: number }[] = [];
  private opts: Required<FakeDbOptions>;

  constructor(opts: FakeDbOptions = {}) {
    this.opts = { maxLatencyMs: opts.maxLatencyMs ?? 0, random: opts.random ?? Math.random, jitterTurns: opts.jitterTurns ?? 0 };
  }

  from(table: string): FakeQuery {
    if (!TABLES[table]) throw new Error(`fake supabase: جدول غير معروف ${table}`);
    return new FakeQuery(this, table);
  }

  /** الدوال المخزّنة (rpc) ما يستخدمها actions/mafia.ts — لو انطلبت نرجع خطأ واضح */
  rpc(name: string): Promise<FakeResult<null>> {
    return Promise.resolve({ data: null, error: { code: "42883", message: `fake supabase: rpc ${name} غير مدعوم` }, count: null });
  }

  /** انتظار دورة (وتأخير عشوائي اختياري) — عشان الطلبات المتزامنة تتداخل */
  async yieldTurn(): Promise<void> {
    const ms = this.opts.maxLatencyMs > 0 ? Math.floor(this.opts.random() * this.opts.maxLatencyMs) : 0;
    // setImmediate بدل setTimeout(0): مؤقت Windows أقل دقته ~15 ملي ثانية، وهذا يبطّئ آلاف الألعاب
    if (ms === 0) await new Promise((r) => setImmediate(r));
    else await new Promise((r) => setTimeout(r, ms));
    const extra = this.opts.jitterTurns > 0 ? Math.floor(this.opts.random() * (this.opts.jitterTurns + 1)) : 0;
    for (let i = 0; i < extra; i++) await new Promise((r) => setImmediate(r));
  }

  rows(table: string): Row[] {
    return this.tables[table];
  }

  /** يتحقق من القيود قبل الإضافة. يرجع خطأ 23505 لو فيه تكرار */
  private violates(table: string, row: Row, ignoreRow?: Row): string | null {
    const def = TABLES[table];
    const rows = this.tables[table];
    const same = (cols: string[], other: Row) => cols.every((c) => other[c] === row[c]) && cols.every((c) => row[c] !== null && row[c] !== undefined);
    for (const cols of [def.pk, ...def.uniques]) {
      if (rows.some((other) => other !== ignoreRow && same(cols, other))) return cols.join(",");
    }
    return null;
  }

  insertRows(table: string, inputs: Row[], upsert?: { onConflict: string[]; ignoreDuplicates: boolean }): { rows: Row[]; error: FakeResult["error"] } {
    const def = TABLES[table];
    const out: Row[] = [];
    const added: Row[] = [];
    for (const input of inputs) {
      const row: Row = { ...def.defaults(), ...input };
      if (upsert) {
        const conflictCols = upsert.onConflict.length ? upsert.onConflict : def.pk;
        const existing = this.tables[table].find((other) => conflictCols.every((c) => other[c] === row[c]));
        if (existing) {
          if (upsert.ignoreDuplicates) continue;
          // تعديل الصف الموجود (ما نغيّر القيم الافتراضية اللي ما جت بالطلب)
          const next = { ...existing, ...input };
          const dup = this.violates(table, next, existing);
          if (dup) {
            added.forEach((a) => this.tables[table].splice(this.tables[table].indexOf(a), 1));
            return { rows: [], error: { code: "23505", message: `duplicate key value violates unique constraint (${dup})` } };
          }
          Object.assign(existing, next);
          out.push(existing);
          continue;
        }
      }
      const dup = this.violates(table, row);
      if (dup) {
        // الطلب كله يفشل (مثل Postgres)
        added.forEach((a) => this.tables[table].splice(this.tables[table].indexOf(a), 1));
        return { rows: [], error: { code: "23505", message: `duplicate key value violates unique constraint (${dup})` } };
      }
      this.tables[table].push(row);
      added.push(row);
      out.push(row);
    }
    return { rows: out, error: null };
  }

  deleteRows(table: string, rows: Row[]): void {
    const set = new Set(rows);
    this.tables[table] = this.tables[table].filter((r) => !set.has(r));
    for (const c of CASCADES.filter((c) => c.parent === table)) {
      const keys = new Set(rows.map((r) => r[c.parentKey]));
      const children = this.tables[c.child].filter((r) => keys.has(r[c.childKey]));
      if (children.length) this.deleteRows(c.child, children);
    }
  }

  /** نسخة عميقة من كل الجداول (للفحص بعد كل خطوة بدون ما نلمس الأصل) */
  snapshot(): Record<string, Row[]> {
    return JSON.parse(JSON.stringify(this.tables));
  }
}

type Op = "select" | "insert" | "update" | "upsert" | "delete";

/** يبني الطلب خطوة خطوة مثل supabase-js، وينفّذ لما ينتظره أحد (thenable) */
export class FakeQuery implements PromiseLike<FakeResult> {
  private op: Op = "select";
  private filters: Filter[] = [];
  private payload: Row[] = [];
  private upsertOpts: { onConflict: string[]; ignoreDuplicates: boolean } | null = null;
  private columns: string | null = null;
  private wantCount = false;
  private head = false;
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private returning = false;

  constructor(private db: FakeSupabase, private table: string) {}

  select(columns = "*", opts?: { count?: "exact"; head?: boolean }): this {
    if (this.op !== "select") this.returning = true;
    this.columns = columns;
    if (opts?.count) this.wantCount = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(values: Row | Row[]): this {
    this.op = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  upsert(values: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.op = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    this.upsertOpts = {
      onConflict: opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : [],
      ignoreDuplicates: Boolean(opts?.ignoreDuplicates),
    };
    return this;
  }
  update(values: Row): this {
    this.op = "update";
    this.payload = [values];
    return this;
  }
  delete(): this {
    this.op = "delete";
    return this;
  }
  eq(col: string, value: unknown): this {
    this.filters.push((r) => {
      const { value: v, text } = readPath(r, col);
      return text ? v === (value === null ? null : String(value)) : v === value;
    });
    return this;
  }
  neq(col: string, value: unknown): this {
    this.filters.push((r) => readPath(r, col).value !== value);
    return this;
  }
  in(col: string, values: unknown[]): this {
    const set = new Set(values);
    this.filters.push((r) => set.has(readPath(r, col).value));
    return this;
  }
  is(col: string, value: null | boolean): this {
    this.filters.push((r) => readPath(r, col).value === value);
    return this;
  }
  gt(col: string, value: unknown): this {
    this.filters.push((r) => {
      const v = readPath(r, col).value;
      return v !== null && v !== undefined && compare(v, value) > 0;
    });
    return this;
  }
  gte(col: string, value: unknown): this {
    this.filters.push((r) => {
      const v = readPath(r, col).value;
      return v !== null && v !== undefined && compare(v, value) >= 0;
    });
    return this;
  }
  lt(col: string, value: unknown): this {
    this.filters.push((r) => {
      const v = readPath(r, col).value;
      return v !== null && v !== undefined && compare(v, value) < 0;
    });
    return this;
  }
  lte(col: string, value: unknown): this {
    this.filters.push((r) => {
      const v = readPath(r, col).value;
      return v !== null && v !== undefined && compare(v, value) <= 0;
    });
    return this;
  }
  /** صيغة PostgREST البسيطة: "col.op.value,col2.op.value" (eq/neq/is/lt/gt فقط) */
  or(expr: string): this {
    const parts = expr.split(",").map((p) => {
      const m = p.trim().match(/^([^.]+)\.(eq|neq|is|lt|gt|lte|gte)\.(.*)$/);
      if (!m) throw new Error(`fake supabase: or() غير مدعوم: ${p}`);
      return { col: m[1], op: m[2], raw: m[3] };
    });
    this.filters.push((r) =>
      parts.some(({ col, op, raw }) => {
        const { value: v, text } = readPath(r, col);
        const val: unknown = raw === "null" ? null : raw === "true" ? true : raw === "false" ? false : raw;
        const cmp = text || typeof v !== "number" ? v : Number(raw);
        switch (op) {
          case "eq":
            return v === (typeof v === "number" ? Number(raw) : val);
          case "neq":
            return v !== (typeof v === "number" ? Number(raw) : val);
          case "is":
            return v === val;
          case "lt":
            return v !== null && compare(v, cmp) < 0;
          case "gt":
            return v !== null && compare(v, cmp) > 0;
          case "lte":
            return v !== null && compare(v, cmp) <= 0;
          case "gte":
            return v !== null && compare(v, cmp) >= 0;
        }
        return false;
      })
    );
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderBy = { col, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }
  single(): this {
    this.mode = "single";
    return this;
  }
  maybeSingle(): this {
    this.mode = "maybeSingle";
    return this;
  }
  abortSignal(): this {
    return this;
  }

  private project(rows: Row[]): Row[] {
    const cols = this.columns;
    if (!cols || cols.trim() === "*") return rows.map((r) => ({ ...r }));
    const names = cols.split(",").map((c) => c.trim()).filter(Boolean);
    return rows.map((r) => Object.fromEntries(names.map((n) => [n, r[n] ?? null])));
  }

  private matching(): Row[] {
    let rows = this.db.rows(this.table).filter((r) => this.filters.every((f) => f(r)));
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      rows = [...rows].sort((a, b) => compare(a[col], b[col]) * (asc ? 1 : -1));
    }
    if (this.limitN !== null) rows = rows.slice(0, this.limitN);
    return rows;
  }

  private finish(rows: Row[], error: FakeResult["error"]): FakeResult {
    if (error) return { data: null, error, count: null };
    if (this.op !== "select" && !this.returning) return { data: null, error: null, count: null };
    const data = this.project(rows);
    if (this.head) return { data: null, error: null, count: this.wantCount ? rows.length : null };
    if (this.mode === "single") {
      if (data.length !== 1) return { data: null, error: { code: "PGRST116", message: `JSON object requested, multiple (or no) rows returned (${data.length})` }, count: null };
      return { data: data[0], error: null, count: this.wantCount ? 1 : null };
    }
    if (this.mode === "maybeSingle") {
      if (data.length > 1) return { data: null, error: { code: "PGRST116", message: `JSON object requested, multiple rows returned (${data.length})` }, count: null };
      return { data: data[0] ?? null, error: null, count: this.wantCount ? data.length : null };
    }
    return { data, error: null, count: this.wantCount ? rows.length : null };
  }

  async execute(): Promise<FakeResult> {
    await this.db.yieldTurn();
    this.db.stats[this.op]++;
    switch (this.op) {
      case "select":
        return this.finish(this.matching(), null);
      case "insert": {
        const { rows, error } = this.db.insertRows(this.table, this.payload);
        this.db.writes.push({ table: this.table, op: "insert", rows: rows.length });
        return this.finish(rows, error);
      }
      case "upsert": {
        const { rows, error } = this.db.insertRows(this.table, this.payload, this.upsertOpts!);
        this.db.writes.push({ table: this.table, op: "upsert", rows: rows.length });
        return this.finish(rows, error);
      }
      case "update": {
        const rows = this.matching();
        const patch = this.payload[0];
        for (const r of rows) Object.assign(r, patch, this.table === "mafia_rooms" ? { updated_at: nowIso() } : {});
        this.db.writes.push({ table: this.table, op: "update", rows: rows.length });
        return this.finish(rows, null);
      }
      case "delete": {
        const rows = this.matching();
        this.db.deleteRows(this.table, rows);
        this.db.writes.push({ table: this.table, op: "delete", rows: rows.length });
        return this.finish(rows, null);
      }
    }
  }

  then<R1 = FakeResult, R2 = never>(
    onfulfilled?: ((value: FakeResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}
