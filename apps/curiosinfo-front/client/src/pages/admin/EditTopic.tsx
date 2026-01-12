import { useState } from "react";
import { useRoute } from "wouter";
import { useTopics, useUpdateTopic, useLinkArticle, useUnlinkArticle, useTopic } from "@/hooks/use-topics";
import { useSearchArticles } from "@/hooks/use-admin";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Link as LinkIcon, Trash2, ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { useDebounce } from "@/hooks/use-debounce"; // We'll create this helper

// Create a simple debouncer inline if not existing
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);
    setIsDebouncing(true);
    return () => clearTimeout(handler);
  });

  return debouncedValue;
}

export default function EditTopic() {
  const [, params] = useRoute("/admin/topics/:id");
  const topicId = Number(params?.id);
  
  // Fetch topic details (we need slug to fetch details via useTopic, but we only have ID here)
  // In a real app we'd have useTopicById, but here we can iterate the list or just fetch list
  // Optimization: Let's fetch the list and find the topic since the list is cached
  const { data: topics } = useTopics();
  const topicBasic = topics?.find(t => t.id === topicId);
  
  // Now fetch full details including articles
  const { data: topic, isLoading: isLoadingTopic } = useTopic(topicBasic?.slug || "");
  
  const updateTopic = useUpdateTopic();
  const linkArticle = useLinkArticle();
  const unlinkArticle = useUnlinkArticle();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounceValue(searchQuery, 500);
  const { data: searchResults, isLoading: isSearching } = useSearchArticles({ search: debouncedSearch });

  if (isLoadingTopic && !topic) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!topicBasic) return <div>Sujet non trouvé</div>;

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateTopic.mutate({
      id: topicId,
      title: formData.get("title") as string,
      summary: formData.get("summary") as string,
      angleNote: formData.get("angleNote") as string,
    }, {
      onSuccess: () => toast({ title: "Modifications enregistrées" })
    });
  };

  const handleLink = (articleId: number) => {
    linkArticle.mutate({ topicId, articleId }, {
      onSuccess: () => toast({ title: "Article lié" })
    });
  };

  const handleUnlink = (articleId: number) => {
    unlinkArticle.mutate({ topicId, articleId }, {
      onSuccess: () => toast({ title: "Article détaché" })
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="ghost" className="pl-0 gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Button>
          </Link>
          <h1 className="text-3xl font-display font-bold">Éditer: {topicBasic.title}</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Edit Form */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Informations Générales</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre</Label>
                    <Input id="title" name="title" defaultValue={topicBasic.title} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="summary">Synthèse</Label>
                    <Textarea 
                      id="summary" 
                      name="summary" 
                      className="min-h-[150px]" 
                      defaultValue={topicBasic.summary || ""} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="angleNote">Note d'Angle (Micro-analyse)</Label>
                    <Textarea 
                      id="angleNote" 
                      name="angleNote" 
                      className="min-h-[100px]" 
                      defaultValue={topicBasic.angleNote || ""} 
                    />
                  </div>
                  <Button type="submit" disabled={updateTopic.isPending} className="w-full">
                    <Save className="w-4 h-4 mr-2" /> Enregistrer
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Articles Liés ({topic?.articles?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {topic?.articles?.map(article => (
                      <div key={article.id} className="flex items-start justify-between p-3 border rounded-lg bg-muted/20">
                        <div className="grid gap-1">
                          <p className="font-medium text-sm line-clamp-2">{article.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{article.actor.name}</Badge>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive h-8 w-8"
                          onClick={() => handleUnlink(article.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {(!topic?.articles || topic.articles.length === 0) && (
                      <p className="text-muted-foreground text-center py-4">Aucun article lié.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right: Article Search */}
          <div className="space-y-8">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Ajouter des articles</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Rechercher des articles..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-[600px] pr-4">
                  {isSearching ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                  ) : (
                    <div className="space-y-3">
                      {searchResults?.map(article => {
                        const isLinked = topic?.articles?.some(a => a.id === article.id);
                        return (
                          <div key={article.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="grid gap-1 mr-4">
                              <p className="font-medium text-sm">{article.title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-bold">{article.actor.name}</span>
                                <span>•</span>
                                <span>{new Date(article.published_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={isLinked ? "secondary" : "default"}
                              disabled={isLinked || linkArticle.isPending}
                              onClick={() => handleLink(article.id)}
                            >
                              {isLinked ? "Lié" : <LinkIcon className="w-4 h-4" />}
                            </Button>
                          </div>
                        );
                      })}
                      {searchQuery && searchResults?.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">Aucun résultat.</p>
                      )}
                      {!searchQuery && (
                        <p className="text-center text-muted-foreground py-8">Commencez à taper pour rechercher...</p>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
