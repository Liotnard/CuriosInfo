import { useEffect, useState } from "react";
import { useTopics } from "@/hooks/use-topics";
import { Header } from "@/components/layout/Header";
import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, CalendarDays, Newspaper, SlidersHorizontal } from "lucide-react";
import { AGE_FILTERS, TOPIC_CATEGORIES, categoryLabel, featuredTopic, filterTopics, topicDate, type AgeFilter, type TopicCategory } from "@shared/topics";

export default function Home() {
  const { data: topics = [], isLoading, error } = useTopics();
  const [age, setAge] = useState<AgeFilter>("all");
  const [category, setCategory] = useState<TopicCategory|"all">("all");
  const [now, setNow] = useState(Date.now);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),60000);return ()=>window.clearInterval(timer);},[]);
  const featured=featuredTopic(topics,now);
  const visible=filterTopics(topics,age,category,now);
  const filtered=age!=="all"||category!=="all";
  const reset=()=>{setAge("all");setCategory("all");};
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 md:py-12">
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-black text-primary mb-5">L’Actualité Décryptée</h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-balance">Les sujets de société à portée politique, à travers les regards des médias, des personnalités et des influenceurs.</p>
        </div>
        {error ? <p role="alert" className="text-center py-12">Impossible de charger les sujets. Réessayez plus tard.</p> : isLoading ? (
          <div aria-label="Chargement des sujets" className="space-y-8">
            <Skeleton className="h-72 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1,2,3].map(i=><Skeleton key={i} className="h-64 w-full rounded-xl" />)}</div>
          </div>
        ) : <>
          {featured && <section aria-labelledby="featured-heading" className="mb-12">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-primary pb-3 mb-0">
              <h2 id="featured-heading" className="text-2xl font-display font-bold">À la Une</h2>
              <p className="text-sm text-muted-foreground">Le sujet de moins de 7 jours le plus documenté</p>
            </div>
            <Link href={`/topics/${featured.slug}`} className="block group rounded-b-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              <article className="bg-primary text-primary-foreground rounded-b-xl p-6 md:p-10 grid md:grid-cols-[minmax(0,1fr)_180px] gap-6 md:gap-10 hover:bg-primary/95 transition-colors">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-primary-foreground/75 mb-4"><span className="border border-white/30 rounded-full px-3 py-1">{categoryLabel(featured.category)}</span><time dateTime={new Date(topicDate(featured)).toISOString()}>{format(topicDate(featured),"d MMMM yyyy",{locale:fr})}</time></div>
                  <h3 className="text-primary-foreground text-2xl sm:text-3xl md:text-4xl font-display font-bold leading-tight mb-4 text-balance">{featured.title}</h3>
                  <p className="text-primary-foreground/80 leading-relaxed max-w-3xl">{featured.summary}</p>
                  <span className="inline-flex items-center gap-2 mt-6 text-sm font-semibold group-hover:underline">Explorer le sujet <ArrowRight aria-hidden="true" className="w-4 h-4" /></span>
                </div>
                <div className="border-t border-white/20 pt-4 md:pt-0 md:border-t-0 md:border-l md:pl-8 flex md:flex-col items-baseline md:justify-center gap-2">
                  <span className="font-display font-black text-4xl md:text-7xl">{featured.articleCount}</span><span className="text-sm text-primary-foreground/75">publications liées</span>
                </div>
              </article>
            </Link>
          </section>}
          <section aria-labelledby="topics-heading">
            <div className="flex items-baseline gap-3 mb-5"><h2 id="topics-heading" className="text-2xl font-display font-bold">Les sujets</h2><span role="status" aria-live="polite" className="text-sm text-muted-foreground">{visible.length} résultat{visible.length>1?"s":""}</span></div>
            <div className="border border-border/70 rounded-xl bg-card p-4 md:p-5 mb-7">
              <div className="grid sm:grid-cols-2 md:grid-cols-[auto_minmax(180px,1fr)_minmax(180px,1fr)_auto] gap-4 items-end">
                <div className="hidden md:flex items-center gap-2 self-center text-sm font-medium pr-3"><SlidersHorizontal className="w-4 h-4" aria-hidden="true" />Filtrer</div>
                <div><label htmlFor="topic-age" className="block text-sm font-medium mb-2">Ancienneté</label><select id="topic-age" value={age} onChange={e=>setAge(e.target.value as AgeFilter)} className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{AGE_FILTERS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
                <div><label htmlFor="topic-category" className="block text-sm font-medium mb-2">Sujet général</label><select id="topic-category" value={category} onChange={e=>setCategory(e.target.value as TopicCategory|"all")} className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><option value="all">Tous les thèmes</option>{TOPIC_CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                <button type="button" onClick={reset} disabled={!filtered} className="h-11 px-2 text-sm underline underline-offset-4 disabled:opacity-40 disabled:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">Réinitialiser</button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Ancienneté depuis le début du sujet. Les filtres s’appliquent à la liste ci-dessous.</p>
            </div>
            {visible.length===0 ? <div className="text-center border border-dashed rounded-xl px-5 py-12"><p className="text-muted-foreground mb-4">{filtered?"Aucun sujet ne correspond à ces filtres.":"Aucun sujet publié pour le moment."}</p>{filtered&&<button onClick={reset} className="text-sm font-medium underline underline-offset-4">Afficher tous les sujets</button>}</div> :
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {visible.map(topic=><Link key={topic.id} href={`/topics/${topic.slug}`} className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                  <Card className="h-full flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/60 hover:border-primary/20 group">
                    <CardHeader className="pb-3"><span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">{categoryLabel(topic.category)}</span><div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><CalendarDays aria-hidden="true" className="w-4 h-4" /><time dateTime={new Date(topicDate(topic)).toISOString()}>{format(topicDate(topic),"d MMM yyyy",{locale:fr})}</time></div><h3 className="text-xl md:text-2xl font-display font-bold group-hover:text-primary transition-colors">{topic.title}</h3></CardHeader>
                    <CardContent className="flex-grow"><p className="text-muted-foreground line-clamp-3 leading-relaxed">{topic.summary||"Aucun résumé disponible pour ce sujet."}</p></CardContent>
                    <CardFooter className="pt-0 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="flex items-center gap-1.5 text-muted-foreground"><Newspaper className="h-4 w-4" aria-hidden="true" />{topic.articleCount} publication{topic.articleCount>1?"s":""}</span><span className="text-primary font-medium inline-flex items-center gap-2">Explorer <ArrowRight aria-hidden="true" className="w-4 h-4" /></span></CardFooter>
                  </Card>
                </Link>)}
              </div>}
          </section>
        </>}
      </main>
    </div>
  );
}
