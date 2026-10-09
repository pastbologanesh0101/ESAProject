// Server-only Supabase REST helper. Uses the secret service key, so never
// import this from a client component.
import 'server-only';

const BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function sb<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE || !KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    ...init,
    cache: 'no-store',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  // `Prefer: return=minimal` writes come back with an empty body.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export type TagRow = { id: number; rfid_uid: string; name: string; active?: boolean };
export const toTag = (t: TagRow) => ({ id: t.id, rfidUid: t.rfid_uid, name: t.name, active: t.active !== false });

export type SurgeryRow = { id: number; procedure_id: string; surgeon: string; started_at: string; ended_at: string | null };
export const toSurgery = (r: SurgeryRow) => ({ id: r.id, procedureId: r.procedure_id, surgeon: r.surgeon, startedAt: r.started_at, endedAt: r.ended_at });
export const SURGERY_COLS = 'id,procedure_id,surgeon,started_at,ended_at';

// Scans (time + tag) between two instants, oldest first.
export async function scansBetween(from: string, to: string) {
  const rows = await sb<{ created_at: string; or_tags: { rfid_uid: string; name: string } }[]>(
    `or_scans?select=created_at,or_tags(rfid_uid,name)&and=(created_at.gte.${new Date(from).toISOString()},created_at.lte.${new Date(to).toISOString()})&order=created_at&limit=5000`,
  );
  return rows.map((r) => ({ time: r.created_at, rfidUid: r.or_tags.rfid_uid, name: r.or_tags.name }));
}
