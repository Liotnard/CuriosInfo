import { useQuery } from "@tanstack/react-query";
import { publicData } from "@/lib/public-data";
import { TopicSchema, TopicWithDetailsSchema } from "@shared/schema";
export function useTopics() {
  return useQuery({queryKey:["topics"],queryFn:async()=>TopicSchema.array().parse(await publicData("index.json"))});
}
export function useTopic(slug:string) {
  return useQuery({queryKey:["topic",slug],enabled:!!slug,queryFn:async()=>TopicWithDetailsSchema.parse(await publicData(`topics/${encodeURIComponent(slug)}.json`))});
}
