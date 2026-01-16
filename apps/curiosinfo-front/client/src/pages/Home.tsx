import { useTopics } from "@/hooks/use-topics";
import { Header } from "@/components/layout/Header";
import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, CalendarDays } from "lucide-react";




export default function Home() {
  const { data: topics, isLoading } = useTopics();

  return (
    
    <div className="min-h-screen bg-background">
      <Header />
      <head><title>Curios Informations</title></head>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-black text-primary mb-6">
            L'Actualité Décryptée
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed text-balance">
            Une analyse comparative des couvertures médiatiques pour comprendre comment l'information est traitée selon les sensibilités éditoriales.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {topics?.map((topic) => (
              <Link key={topic.id} href={`/topics/${topic.slug}`}>
                <Card className="h-full flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-border/60 hover:border-primary/20 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <CalendarDays className="w-4 h-4" />
                      {topic.start_at ? format(new Date(topic.start_at), "d MMM yyyy", { locale: fr }) : "En cours"}
                    </div>
                    <h2 className="text-2xl font-display font-bold group-hover:text-primary transition-colors">
                      {topic.title}
                    </h2>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                      {topic.summary || "Aucun résumé disponible pour ce sujet."}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 text-primary font-medium text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                    Explorer le sujet <ArrowRight className="w-4 h-4" />
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
