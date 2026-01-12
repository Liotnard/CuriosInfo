import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminToken } from "@/hooks/use-admin-token";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";

export default function AdminLogin() {
  const [tokenInput, setTokenInput] = useState("");
  const { saveToken } = useAdminToken();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim().length > 0) {
      saveToken(tokenInput.trim());
      toast({
        title: "Token enregistré",
        description: "Vous êtes maintenant connecté en tant qu'admin.",
      });
      setLocation("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display">Administration</CardTitle>
              <CardDescription>
                Entrez votre clé d'accès administrateur pour gérer le contenu.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Token d'administration..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="text-center tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full font-bold">
                Accéder
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
