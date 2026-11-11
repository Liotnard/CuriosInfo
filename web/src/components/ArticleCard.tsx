import { actorCategory } from "@shared/actors";
import { Article, Actor } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ArticleCardProps {
  article?: Article | null;
  actor?: Actor | null;
}

export function ArticleCard({ article, actor }: ArticleCardProps) {

  const getActorTypeLabel = (type: string) => actorCategory(type).label;

  if (!article) return null;
  const date = new Date(article.published_at);
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md border-border/60 hover:border-border">
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 gap-2">
          <Badge variant="secondary" className="font-normal text-xs text-muted-foreground bg-muted/50 flex-1 truncate">
            {actor?.name || `Source #${article?.actorId}`}
          </Badge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {Number.isFinite(date.getTime()) ? format(date, "d MMM yyyy", { locale: fr }) : "Date inconnue"}
          </span>
        </div>

        <Badge variant="outline" className="mb-3 w-fit text-xs font-normal">
          {getActorTypeLabel((actor?.actor_type  ?? 'en maintenance') as string)}
        </Badge>

        {article.url.includes("example.com/") && <Badge variant="secondary" className="mb-2 w-fit">Démonstration</Badge>}
        <h3 className="font-display font-bold text-lg mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {article?.title}
        </h3>

        <div className="mt-auto pt-4 text-xs text-muted-foreground/50">
          <a
          href={article?.url}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          {article.content_kind === "post" ? "Voir la publication" : article.content_kind === "video" ? "Voir la vidéo" : "Lire la publication"}
        </a>
        </div>
      </div>
    </Card>
  );
}
