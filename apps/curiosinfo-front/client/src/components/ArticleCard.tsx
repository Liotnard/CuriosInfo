import { Article, Actor } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ArticleCardProps {
  article?: Article | null;/*{
    id: number;
    actorId: number;
    title: string;
    published_at: string | Date;
  };*/
  actor?: Actor | null;
}

export function ArticleCard({ article, actor }: ArticleCardProps) {
  /*return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md border-border/60 hover:border-border">
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="font-normal text-xs text-muted-foreground bg-muted/50">
            {article.actor.name}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(article.published_at), "d MMM yyyy", { locale: fr })}
          </span>
        </div>
        
        <h3 className="font-display font-bold text-lg mb-2 leading-snug group-hover:text-primary transition-colors">
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="before:absolute before:inset-0">
            {article.title}
          </a>
        </h3>
        
        {article.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
            {article.excerpt.replace(/<[^>]*>/g, '')}
          </p>
        )}
        
        <div className="mt-auto flex justify-end">
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
        </div>
      </div>
    </Card>
  );*/
  const getActorTypeLabel = (type: string) => {
    switch(type) {
      case 'presse': return 'Presse';
      case 'personnalite' : return 'Personnalité';
      case 'personnalité': return 'Personnalité';
      case 'influenceur': return 'Influenceur';
      case 'presse éditoriale': return 'Presse éditoriale';
      case 'audiovisuel': return 'TV & Radio';
      case 'independants' : return 'Presse indépendante';
      case 'indépendant': return 'Presse indépendante';
      default: return 'inconnu';
    }
  };

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md border-border/60 hover:border-border">
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 gap-2">
          <Badge variant="secondary" className="font-normal text-xs text-muted-foreground bg-muted/50 flex-1 truncate">
            {actor?.name || `Source #${article?.actorId}`}
          </Badge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(new Date((article as any).published_at), "d MMM yyyy", { locale: fr })}
          </span>
        </div>

        <Badge variant="outline" className="mb-3 w-fit text-xs font-normal">
          {getActorTypeLabel((actor?.actor_type /*?? actor?.actor_type*/ ?? 'en maintenance') as string)}
        </Badge>
        
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
          Article lié au sujet
        </a>
        </div>
      </div>
    </Card>
  );
}
