import { useRoute } from "wouter";
import { useTopic } from "@/hooks/use-topics";
import { Header } from "@/components/layout/Header";
import { MediaCartography } from "@/components/MediaCartography";
import { ArticleCard } from "@/components/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { CoverageHistogram } from "@/components/CoverageHistogram";
import { useActor } from "@/hooks/use-media";

export default function TopicDetail() {
  const [, params] = useRoute("/topics/:slug");
  const { data: topic, isLoading, error } = useTopic(params?.slug || "");
  const { data: allActors } = useActor();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 space-y-8">
          <Skeleton className="h-12 w-2/3 max-w-2xl" />
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Sujet non trouvé</h1>
          <p className="text-muted-foreground">Impossible de charger ce sujet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 border-b pb-8"
        >
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-muted-foreground">
            <Badge variant="outline" className="rounded-full px-4 py-1 border-primary/20 text-primary">
              Analyse
            </Badge>
            <span>
              {topic.start_at ? format(new Date(topic.start_at), "d MMMM yyyy", { locale: fr }) : ""}
              {topic.end_at && ` - ${format(new Date(topic.end_at), "d MMMM yyyy", { locale: fr })}`}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-primary mb-6 leading-tight max-w-4xl">
            {topic.title}
          </h1>
        </motion.div>

        <div className="space-y-8 mb-16">
          {/* Summary & Analysis */}
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-display font-bold mb-4">Synthèse</h2>
            <div className="prose prose-stone prose-lg max-w-none leading-relaxed text-muted-foreground">
              {topic.summary ? (
                <p className="whitespace-pre-line">{topic.summary}</p>
              ) : (
                <p className="italic opacity-60">En attente d'une synthèse objective.</p>
              )}
            </div>
          </motion.section>

          {
          <motion.section 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-muted/30 p-6 rounded-xl border border-border/50"
            >
              <h3 className="text-xl font-display font-bold mb-3 flex items-center gap-2">
                L'Angle de traitement
              </h3>
              <div className="prose prose-stone prose-lg max-w-none leading-relaxed text-muted-foreground">
              {topic.angleNote ? (
                <p className="whitespace-pre-line">{topic.angleNote}</p>
              ) : (
                <p className="italic opacity-60">En attente d'une analyse pertinente.</p>
              )}
            </div>
            </motion.section>}

          {/* Actor Cartography with dual charts */}
          <MediaCartography 
            actorInTopic={topic.actorInTopic || []} 
            articles={topic.articles || []}
          />
        </div>

        <Separator className="my-12" />

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-display font-bold">Articles Liés</h2>
            <span className="text-muted-foreground">{topic.articles?.length || 0} articles</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {topic.articles?.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * Math.min(index, 10) }}
              >
                <ArticleCard
                  /*article={{ ...article, published_at: article.published_at || article.created_at }}
                  actor={topic.actorInTopic?.find((m) => m.id === article.actorId)}*/
                  article={article}
                  actor={article.actor ?? topic.actorInTopic?.find((m) => m.id === article.actorId)}
                />
              </motion.div>
            ))}
          </div>

          {(!topic.articles || topic.articles.length === 0) && (
             <div className="text-center py-12 text-muted-foreground">
               Aucun article lié pour le moment.
             </div>
          )}
        </section>
        
        <Separator className="my-12" />

        <CoverageHistogram
              allActors={allActors || []}
              articles={topic.articles || []}
          />
      </main>
    </div>
  );
}
