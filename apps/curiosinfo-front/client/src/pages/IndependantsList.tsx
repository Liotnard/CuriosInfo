import { useActor } from "@/hooks/use-media";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Rss } from "lucide-react";

interface ActorCardProps {
  name: string;
  feed_url: string;
  libAutor?: number;
  indivCol?: number;
  natioMon?: number;
  progCons?: number;
}

function ActorCard({ name, feed_url, libAutor, indivCol, natioMon, progCons }: ActorCardProps) {
  const getAxisLabel = (value: number, leftLabel: string, rightLabel: string) => {
    if (Math.abs(value) < 2) return "Neutre";
    return value < 0 ? leftLabel : rightLabel;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-display font-bold text-lg">
          {name}
        </CardTitle>
        <a 
          href={feed_url} 
          target="_blank" 
          rel="noreferrer" 
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <Rss className="h-4 w-4" />
        </a>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/30 p-2 rounded text-center">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Lib-Auth</span>
              <span className="font-mono font-medium">{typeof libAutor === "number" ? libAutor.toFixed(1) : "-"}</span>
            </div>
            <div className="bg-muted/30 p-2 rounded text-center">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Ind-Col</span>
              <span className="font-mono font-medium">{typeof indivCol === "number" ? indivCol.toFixed(1) : "-"}</span>
            </div>
            <div className="bg-muted/30 p-2 rounded text-center">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Nat-Mond</span>
              <span className="font-mono font-medium">{typeof natioMon === "number" ? natioMon.toFixed(1) : "-"}</span>
            </div>
            <div className="bg-muted/30 p-2 rounded text-center">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Prog-Cons</span>
              <span className="font-mono font-medium">{typeof progCons === "number" ? progCons.toFixed(1) : "-"}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              {getAxisLabel(libAutor ?? 0, "Libertaire", "Autoritaire")}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {getAxisLabel(indivCol ?? 0, "Collectiviste", "Individualiste")}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {getAxisLabel(natioMon ?? 0, "Nationaliste", "Mondialiste")}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {getAxisLabel(progCons ?? 0, "Conservateur", "Progressiste")}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IndependantsList() {
  const { data: actorList, isLoading } = useActor();
  const IndependantsList = actorList?.filter(m => (m.actor_type ?? m.actor_type ?? m.type) === "independants") || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-display font-bold mb-4">Presse indépendante</h1>
          <p className="text-muted-foreground">
            Medias indépendants proposant des contenus variés et alternatifs, souvent axés sur l'investigation, la culture ou l'actualité.
          </p>
        </div>

        {isLoading ? (
           <div className="grid md:grid-cols-3 gap-6">
             <Skeleton className="h-40 w-full" />
             <Skeleton className="h-40 w-full" />
             <Skeleton className="h-40 w-full" />
           </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {IndependantsList.map((actor) => (
              <ActorCard
                key={actor.id}
                name={actor.name}
                feed_url={actor.feed_url}
                libAutor={actor.lib_autor}
                indivCol={actor.indiv_col}
                natioMon={actor.natio_mon}
                progCons={actor.prog_cons}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
