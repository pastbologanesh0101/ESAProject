import { sb, toSurgery, scansBetween, SURGERY_COLS, type SurgeryRow } from '@/lib/supabase';
import { isAdmin, unauthorized } from '@/lib/auth';
import { procedureById } from '@/lib/procedures';
import { analyze } from '@/lib/surgery';

export const dynamic = 'force-dynamic';

// Recent surgeries with a summary of each (for the records list).
export async function GET() {
  const rows = await sb<SurgeryRow[]>(`or_surgeries?select=${SURGERY_COLS}&order=started_at.desc&limit=10`);
  const out = await Promise.all(rows.map(async (r) => {
    const s = toSurgery(r);
    const proc = procedureById(s.procedureId);
    const end = s.endedAt ?? new Date().toISOString();
    const a = analyze(await scansBetween(s.startedAt, end), proc?.steps ?? [], new Date(s.startedAt).getTime(), new Date(end).getTime());
    return {
      ...s,
      procedureName: proc?.name ?? s.procedureId,
      durationMs: a.durationMs,
      cycles: a.cycles.length,
      stepsDone: a.stepsDone,
      stepsTotal: proc?.steps.length ?? 0,
      stillOut: a.stillOut.length,
    };
  }));
  return Response.json(out);
}

// Start a surgery. Only one can run at a time.
export async function POST(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const surgeon = typeof body.surgeon === 'string' ? body.surgeon.trim() : '';
  const proc = procedureById(String(body.procedureId ?? ''));
  if (!proc) return Response.json({ error: 'Choose a procedure' }, { status: 400 });
  if (!surgeon || surgeon.length > 60) return Response.json({ error: "Enter the surgeon's name" }, { status: 400 });

  const active = await sb<SurgeryRow[]>(`or_surgeries?select=id&ended_at=is.null`);
  if (active.length) return Response.json({ error: 'A surgery is already in progress' }, { status: 409 });

  const [row] = await sb<SurgeryRow[]>(`or_surgeries?select=${SURGERY_COLS}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ procedure_id: proc.id, surgeon }),
  });
  return Response.json(toSurgery(row));
}
