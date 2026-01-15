import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
//import { InsertActor } from "@shared/schema";
import type { Actor } from "@shared/contracts";
import type { z } from "zod";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    ...options.headers as Record<string, string>,
    ...(token ? { 'x-admin-token': token } : {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Request failed");
  }
  return res;
}

export function useActor() {
  return useQuery({
    queryKey: [api.actor.list.path],
    queryFn: async () => {
      const res = await fetch(api.actor.list.path);
      if (!res.ok) throw new Error("Failed to fetch actor");
      const parsed = api.actor.list.responses[200].parse(await res.json()) as any[];

      // Normalize numeric axis fields so the UI can safely call .toFixed
      return parsed.map((m) => ({
        ...m,
        libAutor: typeof m.libAutor === "number" ? m.libAutor : 0,
        indivCol: typeof m.indivCol === "number" ? m.indivCol : 0,
        natioMon: typeof m.natioMon === "number" ? m.natioMon : 0,
        progCons: typeof m.progCons === "number" ? m.progCons : 0,
      }));
    },
  });
}

type UpdateActorInput = z.infer<typeof api.actor.update.input>;

export function useUpdateActor() {
  const queryClient = useQueryClient();
  return useMutation({
    //mutationFn: async ({ id, ...data }: Partial<InsertActor> & { id: number }) => {
    mutationFn: async ({ id, ...data }: UpdateActorInput & { id: number }) => {
      const url = buildUrl(api.actor.update.path, { id });
      const res = await fetchWithAuth(url, {
        method: api.actor.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return api.actor.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.actor.list.path] }),
  });
}
