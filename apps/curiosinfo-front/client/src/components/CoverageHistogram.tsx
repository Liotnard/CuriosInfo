import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
//import type { Actor } from "@shared/schema";
import type { Actor } from "@shared/contracts";

type TopicArticleData = { actorId: number };

interface CoverageHistogramProps {
  allActors: Actor[];        // IMPORTANT : base complète
  articles: TopicArticleData[]; // articles du topic
}

function normalizeType(t?: string | null) {
  const s = (t || "presse").toLowerCase().trim();
  if (s === "press") return "presse";
  if (s === "audiovisual") return "audiovisuel";
  if (s === "influencer") return "influenceur";
  if (s === "personnalite") return "personnalité";
  if (s === "indépendant") return "independants";
  return s;
}

function typeLabel(t: string) {
  if (t === "presse") return "Pr. éditoriale";
  if (t === "audiovisuel") return "TV / Radio";
  if (t === "independants") return "Pr. Indépendante";
  if (t === "personnalité") return "Pe. politiques";
  if (t === "influenceur") return "Influenceurs";
  return t;
}

function typeColor(typeRaw: string) {
  const t = normalizeType(typeRaw);
  return (t === "influenceur") ? "hsl(103, 93%, 48%)"
    : (t === "personnalité") ? "hsl(0, 80%, 50%)"
      : (t === "audiovisuel") ? "hsl(197, 88%, 48%)"
        : (t === "presse") ? "hsl(44, 79%, 46%)"
          : (t === "independants") ? "hsl(300, 80%, 50%)"
            : "hsl(210 8% 45%)";
}

export function CoverageHistogram({ allActors, articles }: CoverageHistogramProps) {
  const data = useMemo(() => {
    // actors qui ont couvert: set des actorId présents dans les articles du topic
    const coveredSet = new Set<number>();
    for (const a of articles) coveredSet.add(a.actorId);

    const byType = new Map<string, { typeRaw: string; total: number; covered: number }>();

    for (const a of allActors || []) {
      const id = (a as any).id as number;
      const t = normalizeType((a as any).actor_type);

      const curr = byType.get(t) || { typeRaw: t, total: 0, covered: 0 };
      curr.total += 1;
      if (coveredSet.has(id)) curr.covered += 1;
      byType.set(t, curr);
    }

    return Array.from(byType.values())
      .map((r) => {
        const pct = r.total > 0 ? (r.covered / r.total) * 100 : 0;
        const coveragePct = Math.round(pct * 10) / 10; // 1 décimale
        return {
          type: typeLabel(r.typeRaw),
          typeRaw: r.typeRaw,
          coveragePct,
          covered: r.covered,
          total: r.total,
        };
      })
      .sort((a, b) => b.coveragePct - a.coveragePct);
  }, [allActors, articles]);

  if (!allActors || allActors.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center bg-muted/20 rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">Pas assez de données pour l’histogramme</p>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.35 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Couverture par type</h2>
          <p className="text-sm text-muted-foreground">
            Part des acteurs (par catégorie) ayant publié au moins un article sur ce sujet.
          </p>
        </div>
        <Badge variant="secondary">sur {allActors.length} acteurs suivis</Badge>
      </div>

      <div className="bg-card rounded-2xl border p-6 shadow-sm">
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <XAxis dataKey="type" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as any;
                  return (
                    <div className="bg-popover border border-border shadow-lg rounded-lg p-3 text-sm">
                      <p className="font-bold font-display">{label}</p>
                      <p className="text-muted-foreground">
                        {p.covered} / {p.total} en parlent
                      </p>
                      <p className="mt-1">
                         Taux d'implication : <span className="font-medium">{p.coveragePct}%</span>
                      </p>
                    </div>
                  );
                }}
              />

              <Bar dataKey="coveragePct" name="Couverture" radius={[8, 8, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={typeColor(entry.typeRaw)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Chaque barre correspond à une catégorie. La hauteur indique le pourcentage d’acteurs de cette catégorie ayant couvert le sujet.
        </p>
      </div>
    </motion.section>
  );
}
