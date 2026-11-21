import { NextResponse } from "next/server";
import { desc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { guard } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const unreadSql = sql<number>`(select count(*)::int from messages m where m.patient_id = ${patients.id} and m.direction = 'in' and m.read = false)`;
  const urgentSql = sql<number>`(select count(*)::int from messages m where m.patient_id = ${patients.id} and m.direction = 'in' and m.read = false and m.urgent = true)`;
  const lastBodySql = sql<string | null>`(select m.body from messages m where m.patient_id = ${patients.id} order by m.created_at desc, m.id desc limit 1)`;
  const nextApptSql = sql<string | null>`(select min(a.starts_at) from appointments a where a.patient_id = ${patients.id} and a.starts_at > now() and a.status in ('pending','confirmed'))`;

  const like = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const rows = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      lastIntent: patients.lastIntent,
      lastMessageAt: patients.lastMessageAt,
      unread: unreadSql,
      urgentUnread: urgentSql,
      lastBody: lastBodySql,
      nextAppt: nextApptSql,
    })
    .from(patients)
    .where(like ? or(ilike(patients.name, like), ilike(patients.phone, like)) : undefined)
    .orderBy(desc(sql`coalesce(${patients.lastMessageAt}, ${patients.createdAt})`))
    .limit(200);
  return NextResponse.json({ patients: rows });
}
