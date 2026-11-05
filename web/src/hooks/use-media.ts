import { useQuery } from "@tanstack/react-query";
import { publicData } from "@/lib/public-data";
import { ActorSchema } from "@shared/schema";
export function useActor() {
  return useQuery({queryKey:["actors"],queryFn:async()=>ActorSchema.array().parse(await publicData("actors.json"))});
}
