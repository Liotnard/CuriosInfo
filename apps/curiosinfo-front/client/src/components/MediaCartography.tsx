import { useState, useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ReferenceLine, Label } from 'recharts';
import { Actor } from "@shared/schema";
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";

interface TopicArticleData {
  id: number;
  topicId?: number;
  actorId: number;
  title: string;
  excerpt?: string | null;
  published_at: string | Date;
  created_at?: string | Date;
}

interface MediaCartographyProps {
  actorInTopic: Actor[];
  articles: TopicArticleData[];
}

type ChartVariant = 'libertyAuthority' | 'nationalismGlobalism';

interface ChartConfig {
  variant: ChartVariant;
  title: string;
  subtitle: string;
  xLabel: { left: string; right: string };
  yLabel: { top: string; bottom: string };
  xKey: 'libAutor' | 'natioMon';
  yKey: 'indivCol' | 'progCons';
}

const CHARTS: ChartConfig[] = [
  {
    variant: 'libertyAuthority',
    title: 'Control vs Communauté',
    subtitle: 'Axe du pouvoir',
    xLabel: { left: 'Libertaire', right: 'Autoritaire' },
    yLabel: { top: 'Collectiviste', bottom: 'Individualiste' },
    xKey: 'libAutor',
    yKey: 'indivCol',
  },
  {
    variant: 'nationalismGlobalism',
    title: 'Culture vs Ouverture',
    subtitle: 'Axe du patrimoine',
    xLabel: { left: 'Nationaliste', right: 'Mondialiste' },
    yLabel: { top: 'Conservateur', bottom: 'Progressiste' },
    xKey: 'natioMon',
    yKey: 'progCons',
  },
];

export function MediaCartography({ actorInTopic, articles }: MediaCartographyProps) {
  const [activeActorId, setActiveActorId] = useState<number | null>(null);
  const [lockedActorId, setLockedActorId] = useState<number | null>(null);

  const effectiveActorId = lockedActorId ?? activeActorId;

  // Count articles per actor
  const articleCounts = useMemo(() => {
    return articles.reduce((acc, curr) => {
      acc[curr.actorId] = (acc[curr.actorId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }, [articles]);

  // Map actorId -> actor_type (take first found actor_type from articles)
  // Map actorId -> actor_type using `actorInTopic` (normalized source of truth)
  const actorTypes = useMemo(() => {
    return (actorInTopic || []).reduce((acc, m) => {
      const id = (m as any).id as number;
      const mt = (m as any).actor_type ?? (m as any).actor_type ?? 'presse';
      if (id) acc[id] = mt;
      return acc;
    }, {} as Record<number, string>);
  }, [actorInTopic]);

  const renderChart = (config: ChartConfig) => {
    // Helper: accept either camelCase (libAutor) or snake_case (lib_autor)
    const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    const getNumeric = (obj: any, key: string) => {
      const raw = obj[key] ?? obj[toSnake(key)];
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    };

    const data = actorInTopic
      .map((m) => {
        const xVal = getNumeric(m as any, config.xKey);
        const yVal = getNumeric(m as any, config.yKey);
        return {
          id: (m as any).id,
          name: (m as any).name,
          actor_type: actorTypes[(m as any).id] || 'presse',
          x: xVal,
          y: yVal,
          count: articleCounts[(m as any).id] || 0,
          // Add jitter to prevent overlap
          xWithJitter: xVal + (Math.random() * 0.2 - 0.1),
          yWithJitter: yVal + (Math.random() * 0.2 - 0.1),
        };
      })
      .filter((item) => item.count > 0);

    if (data.length === 0) {
      return (
        <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg border border-dashed">
          <p className="text-muted-foreground text-sm">Pas assez de données pour ce graphique</p>
        </div>
      );
    }

    return (
      <div>
        <div className="w-full h-[400px] font-sans">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
              <ReferenceLine x={0} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeOpacity={0.5} />

              <XAxis
                type="number"
                dataKey="xWithJitter"
                name={config.title}
                domain={[-10, 10]}
                tick={false}
                axisLine={false}
              >
                <Label value={config.xLabel.left} offset={0} position="insideLeft" className="fill-muted-foreground text-xs font-medium" />
                <Label value={config.xLabel.right} offset={0} position="insideRight" className="fill-muted-foreground text-xs font-medium" />
              </XAxis>

              <YAxis
                type="number"
                dataKey="yWithJitter"
                name={config.title}
                domain={[-10, 10]}
                tick={false}
                axisLine={false}
              >
                <Label value={config.yLabel.top} offset={10} position="insideTop" className="fill-muted-foreground text-xs font-medium" />
                <Label value={config.yLabel.bottom} offset={10} position="insideBottom" className="fill-muted-foreground text-xs font-medium" />
              </YAxis>

              <ZAxis type="number" dataKey="count" range={[60, 300]} name="Articles" />

              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border shadow-lg rounded-lg p-3 text-sm z-50">
                        <p className="font-bold font-display">{data.name}</p>
                        <p className="text-muted-foreground text-xs">{data.count} article{data.count > 1 ? 's' : ''}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Scatter name="Actor" data={data}>
                {data.map((entry, index) => {
                  const isActive = effectiveActorId === entry.id;
                  const isInactive = effectiveActorId && !isActive;
                  // Color by actor_type: presse=grey, personnalité=blue, influenceur=red
                  const type = (entry as any).actor_type as string;
                  const color = (type === 'influenceur' || type === 'influencer') ? 'hsl(103, 93%, 48%)'
                    : (type === 'personnalité' || type === 'personnalite') ? 'hsl(0, 80%, 50%)'
                      : (type === 'audiovisuel' || type === 'audiovisual') ? 'hsl(197, 88%, 48%)'
                        : (type === 'presse' || type === 'press') ? 'hsl(44, 79%, 46%)'
                          : (type === 'independant' || type === 'indépendant') ? 'hsl(300, 80%, 50%)'
                            : 'hsl(210 8% 45%)';

                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={color}
                      fillOpacity={isActive ? 1 : isInactive ? 0.2 : 0.6}
                      onClick={() => setLockedActorId(lockedActorId === entry.id ? null : entry.id)}
                      onMouseEnter={() => setActiveActorId(entry.id)}
                      onMouseLeave={() => setActiveActorId(null)}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Axis labels at bottom */}
        <div className="mt-4 text-xs text-center text-muted-foreground flex justify-between px-8">
          {/*<span>{config.xLabel.left}</span>
          <span>{config.xLabel.right}</span>*/}
        </div>
      </div>
    );
  };

  const emptyState = actorInTopic.length === 0;

  if (emptyState) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">Pas assez de données pour les cartographies</p>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Cartographie des Médias</h2>
        <Badge variant="secondary">{actorInTopic.length} Sources</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {CHARTS.map((config) => (
          <motion.div
            key={config.variant}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-card rounded-2xl border p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-lg font-display font-bold">{config.title}</h3>
                <p className="text-sm text-muted-foreground">{config.subtitle}</p>
              </div>
              {renderChart(config)}
            </div>
          </motion.div>
        ))}
      </div>

      <p className="mt-4 text-xs text-center text-muted-foreground">
        Survolez un point pour voir ses coordonnées sur les deux cartes. Cliquez pour fixer la sélection.
      </p>
    </motion.section>
  );
}
