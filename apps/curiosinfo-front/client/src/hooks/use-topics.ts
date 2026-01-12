import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertTopic, InsertArticle, Article, Topic } from "@shared/schema";
import { useAdminToken } from "./use-admin-token";

// Custom fetch wrapper that injects admin token
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

export function useTopics() {
  return useQuery({
    queryKey: [api.topics.list.path],
    queryFn: async () => {
      const res = await fetch(api.topics.list.path);
      if (!res.ok) throw new Error("Failed to fetch topics");
      return api.topics.list.responses[200].parse(await res.json());
    },
  });
}

export function useTopic(slug: string) {
  return useQuery({
    queryKey: [api.topics.get.path, slug],
    queryFn: async () => {
      const url = buildUrl(api.topics.get.path, { slug });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch topic");
      return api.topics.get.responses[200].parse(await res.json());
    },
    enabled: !!slug,
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTopic) => {
      const res = await fetchWithAuth(api.topics.create.path, {
        method: api.topics.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return api.topics.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.topics.list.path] }),
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InsertTopic> & { id: number }) => {
      const url = buildUrl(api.topics.update.path, { id });
      const res = await fetchWithAuth(url, {
        method: api.topics.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return api.topics.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.topics.list.path] });
      // Invalidate the detail view as well
      queryClient.invalidateQueries({ queryKey: [api.topics.get.path] }); 
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.topics.delete.path, { id });
      await fetchWithAuth(url, { method: api.topics.delete.method });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.topics.list.path] }),
  });
}

export function useLinkArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ topicId, articleId }: { topicId: number; articleId: number }) => {
      const url = buildUrl(api.topics.linkArticle.path, { id: topicId });
      const res = await fetchWithAuth(url, {
        method: api.topics.linkArticle.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      return api.topics.linkArticle.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate topics lists and details to show new article count/content
      queryClient.invalidateQueries({ queryKey: [api.topics.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.topics.get.path] });
    },
  });
}

export function useUnlinkArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ topicId, articleId }: { topicId: number; articleId: number }) => {
      const url = buildUrl(api.topics.unlinkArticle.path, { id: topicId, articleId });
      await fetchWithAuth(url, { method: api.topics.unlinkArticle.method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.topics.get.path] });
    },
  });
}
