import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTopics, useCreateTopic, useDeleteTopic } from "@/hooks/use-topics";
import { useIngest } from "@/hooks/use-admin";
import { useAdminToken } from "@/hooks/use-admin-token";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, RefreshCw, FileEdit } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function CreateTopicDialog() {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useCreateTopic();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const summary = formData.get("summary") as string;

    mutate(
      { title, slug, summary, angleNote: "", startAt: new Date(), endAt: null },
      {
        onSuccess: () => {
          setOpen(false);
          toast({ title: "Sujet créé avec succès" });
        },
        onError: (err) => {
          toast({ title: "Erreur", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Nouveau Sujet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un nouveau sujet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" required placeholder="ex: Réforme des Retraites" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input id="slug" name="slug" required placeholder="ex: reforme-retraites-2024" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Résumé initial</Label>
            <Textarea id="summary" name="summary" placeholder="Brève description..." />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IngestButton() {
  const { mutate, isPending } = useIngest();
  const { toast } = useToast();

  return (
    <Button 
      variant="outline" 
      onClick={() => mutate(undefined, {
        onSuccess: (data) => {
          toast({ 
            title: "Ingestion terminée", 
            description: `${data.newArticles} articles ajoutés. ${data.errors} erreurs.` 
          });
        }
      })}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
      Lancer l'ingestion RSS
    </Button>
  );
}

export default function AdminDashboard() {
  const { token } = useAdminToken();
  const [, setLocation] = useLocation();
  const { data: topics, isLoading } = useTopics();
  const deleteTopic = useDeleteTopic();
  const { toast } = useToast();

  // Redirect if not authenticated
  if (!token) {
    setLocation("/admin/login");
    return null;
  }

  const handleDelete = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce sujet ?")) {
      deleteTopic.mutate(id, {
        onSuccess: () => toast({ title: "Sujet supprimé" }),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">Tableau de bord</h1>
          <div className="flex gap-4">
            <IngestButton />
            <CreateTopicDialog />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sujets Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Date création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topics?.map((topic) => (
                    <TableRow key={topic.id}>
                      <TableCell className="font-medium">{topic.title}</TableCell>
                      <TableCell className="text-muted-foreground">{topic.slug}</TableCell>
                      <TableCell>
                        {format(new Date(topic.created_at), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Link href={`/admin/topics/${topic.id}`}>
                          <Button variant="ghost" size="icon">
                            <FileEdit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(topic.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {topics?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucun sujet pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
