import { normalizeActorType } from "../shared/actors";

export function normalizeActor(raw: any) {
  const value = (camel: string, snake: string) => {
    const n = Number(raw[camel] ?? raw[snake] ?? 0);
    if (!Number.isFinite(n) || n < -10 || n > 10) throw new Error(`Invalid axis ${camel} for actor ${raw.id}`);
    return n;
  };
  return { ...raw, actor_type: normalizeActorType(raw.actor_type), libAutor: value("libAutor", "lib_autor"), indivCol: value("indivCol", "indiv_col"), natioMon: value("natioMon", "natio_mon"), progCons: value("progCons", "prog_cons"), updatedAt: raw.updatedAt ?? raw.updated_at };
}
