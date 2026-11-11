import { Link } from "wouter";
import { useActor } from "@/hooks/use-media";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import type { Actor } from "@shared/schema";
import { ACTOR_AXES, normalizeActorType } from "@shared/actors";

function ActorCard({ actor, independentView }: { actor: Actor; independentView: boolean }) {
  const evidence = actor.independence;
  return <Card className="hover:shadow-md transition-shadow" data-actor-card={actor.id}>
    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
      <CardTitle className="font-display font-bold text-lg">{actor.name}</CardTitle>
      <a href={actor.website_url || actor.feed_url} target="_blank" rel="noreferrer" aria-label={'Consulter la source : ' + actor.name} className="text-muted-foreground hover:text-primary"><ExternalLink className="h-4 w-4" /></a>
    </CardHeader>
    <CardContent>
      {independentView && <div className="mb-5 space-y-2 text-sm">
        <Badge variant={evidence ? "secondary" : "outline"}>{evidence ? "Modèle documenté" : "Modèle à documenter"}</Badge>
        {evidence && <><p><span className="font-medium">Gouvernance : </span>{evidence.governance}</p><p><span className="font-medium">Financement : </span>{evidence.funding}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">{evidence.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 text-primary">{source.title}</a>)}</div>
          <p className="text-xs text-muted-foreground">Sources consultées le {new Date(evidence.checked_at).toLocaleDateString("fr-FR")}. Informations publiées par le média.</p></>}
      </div>}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {ACTOR_AXES.map(axis => <div key={axis.key} className="bg-muted/30 p-2 rounded text-center" title={'−10 : ' + axis.low + ' ; +10 : ' + axis.high}>
          <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">{axis.short}</span>
          <span className="font-mono font-medium">{actor[axis.key].toFixed(1)}</span>
        </div>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{ACTOR_AXES.map(axis => <Badge key={axis.key} variant="outline" className="text-xs font-normal">{Math.abs(actor[axis.key]) < 2 ? "Position centrale" : actor[axis.key] < 0 ? axis.low : axis.high}</Badge>)}</div>
    </CardContent>
  </Card>;
}
export default function ActorsList({ category, title = "Panorama médiatique" }: { category?: string; title?: string }) {
  const { data, isLoading, error } = useActor();
  const independentView = normalizeActorType(category) === "independants";
  const actorList = data?.filter(actor => !category || normalizeActorType(actor.actor_type) === normalizeActorType(category))
    .sort((a, b) => independentView ? Number(Boolean(b.independence)) - Number(Boolean(a.independence)) || a.name.localeCompare(b.name, "fr") : a.name.localeCompare(b.name, "fr"));
  return <div className="min-h-screen bg-background"><Header /><main className="container mx-auto px-4 py-10 sm:py-12">
    <div className="mb-8 text-center max-w-3xl mx-auto"><h1 className="text-4xl font-display font-bold mb-4">{title}</h1>
      <p className="text-muted-foreground">{independentView ? "Financement et liberté éditoriale sont liés. Cette catégorie examine les moyens dont dispose un média pour préserver ses choix face aux intérêts de ses financeurs." : "Les acteurs référencés et leur positionnement sur quatre axes éditoriaux."}</p>
      <Link href={independentView ? "/faq#independance" : "/faq#axes"} className="mt-3 inline-block text-sm text-primary underline underline-offset-4">{independentView ? "Comment définissons-nous l’indépendance ?" : "Comment lire ces positionnements ?"}</Link>
    </div>
    {independentView && <section aria-labelledby="independence-definition" className="mb-8 rounded-2xl border bg-card p-5 sm:p-6 max-w-4xl mx-auto">
      <h2 id="independence-definition" className="font-display font-bold text-lg mb-2">Une autonomie à documenter</h2>
      <p className="text-sm text-muted-foreground">Nous regardons qui possède le média, d’où viennent ses revenus et quelles garanties protègent les choix de sa rédaction. Le contrôle par les journalistes, une structure associative ou le soutien des lecteurs peuvent contribuer à cette autonomie ; aucun modèle ne la garantit à lui seul.</p>
      <p className="mt-2 text-sm text-muted-foreground">Les premières fiches documentées présentent leurs sources. Les autres classements restent à examiner. L’indépendance ne signifie ni absence de convictions, ni infaillibilité.</p>
    </section>}
    {error && <p role="alert">Impossible de charger les sources. Réessayez plus tard.</p>}
    {isLoading ? <div className="grid md:grid-cols-3 gap-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}</div> : <>
      <p className="mb-4 text-sm text-muted-foreground">{actorList?.length ?? 0} acteurs référencés{independentView ? ' · ' + (actorList?.filter(a => a.independence).length ?? 0) + ' modèles documentés' : ''}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{actorList?.map(actor => <ActorCard key={actor.id} actor={actor} independentView={independentView} />)}</div>
    </>}
  </main></div>;
}
