import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

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

export function useSearchArticles(params: { search?: string; actorId?: number }) {
  // Serialize params for query key stability
  const queryString = new URLSearchParams();
  if (params.search) queryString.append('search', params.search);
  if (params.actorId) queryString.append('actorId', String(params.actorId));

  return useQuery({
    queryKey: [api.admin.searchArticles.path, queryString.toString()],
    queryFn: async () => {
      const url = `${api.admin.searchArticles.path}?${queryString.toString()}`;
      const res = await fetchWithAuth(url);
      return api.admin.searchArticles.responses[200].parse(await res.json());
    },
    enabled: !!params.search || !!params.actorId, // Only search when we have criteria
  });
}

export function useIngest() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth(api.admin.ingest.path, {
        method: api.admin.ingest.method,
      });
      return api.admin.ingest.responses[200].parse(await res.json());
    },
  });
}
