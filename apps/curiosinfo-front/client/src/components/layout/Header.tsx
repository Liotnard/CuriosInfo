import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAdminToken } from "@/hooks/use-admin-token";
import { Newspaper, Lock, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [location] = useLocation();
  const { token, removeToken } = useAdminToken();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ferme le menu quand on change de route (meilleure UX)
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const navLinks = [
    { href: "/", label: "Les Sujets" },
    { href: "/presse", label: "Presse éditoriale" },
    { href: "/audiovisuel", label: "TV / Radio" },
    { href: "/independants", label: "Presse Indépendante" },
    { href: "/personnalites", label: "Personnalités" },
    { href: "/influenceurs", label: "Influenceurs" },
  ] as const;

  const linkClass = (href: string) =>
    location === href ? "text-foreground" : "hover:text-foreground transition-colors";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo: sur desktop => navigation vers "/"
              sur mobile => toggle menu burger */}
          <Link
            href="/"
            onClick={(e) => {
              // En mobile, on utilise CuriosInfo comme bouton de menu
              if (window.matchMedia("(max-width: 767px)").matches) {
                e.preventDefault();
                setMobileOpen((v) => !v);
              }
            }}
            className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight"
            aria-label="CuriosInfo"
          >
            <Newspaper className="h-6 w-6" />
            <span>CuriosInfo</span>

            {/* Icône burger visible uniquement en mobile */}
            <span className="md:hidden ml-2 inline-flex items-center">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {token ? (
            <>
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Lock className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={removeToken} className="gap-2" aria-label="Se déconnecter">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Link href="/admin/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Connexion
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Menu mobile (dropdown) */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={[
                    "rounded-md px-3 py-2",
                    location === l.href ? "bg-muted text-foreground" : "hover:bg-muted hover:text-foreground transition-colors",
                  ].join(" ")}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Optionnel : actions admin en mobile si tu veux les dupliquer ici */}
            {/* Tu peux aussi laisser uniquement les boutons à droite dans la barre */}
          </div>
        </div>
      )}
    </header>
  );
}
