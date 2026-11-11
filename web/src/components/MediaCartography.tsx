import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, ReferenceLine, Label } from "recharts";
import type { Actor } from "@shared/schema";
import { ACTOR_AXES, ACTOR_CATEGORIES, actorCategory, floatingLabelPosition } from "@shared/actors";
import { Badge } from "@/components/ui/badge";

type TopicArticleData = { actorId: number };
interface MediaCartographyProps { actorInTopic: Actor[]; articles: TopicArticleData[] }
interface ChartConfig {
  id: string; title: string; subtitle: string;
  xKey: "libAutor" | "natioMon"; yKey: "indivCol" | "progCons";
  left: string; right: string; top: string; bottom: string;
}
const CHARTS: ChartConfig[] = [
  { id: "power", title: "Contrôle et communauté", subtitle: "Axe du pouvoir", xKey: "libAutor", yKey: "indivCol", left: ACTOR_AXES[0].low, right: ACTOR_AXES[0].high, top: ACTOR_AXES[1].high, bottom: ACTOR_AXES[1].low },
  { id: "culture", title: "Culture et ouverture", subtitle: "Axe du patrimoine", xKey: "natioMon", yKey: "progCons", left: ACTOR_AXES[2].low, right: ACTOR_AXES[2].high, top: ACTOR_AXES[3].high, bottom: ACTOR_AXES[3].low },
];
type ChartActor = Actor & { count: number };
interface ActorChartProps {
  config: ChartConfig; actors: ChartActor[]; effectiveId: number | null; lockedId: number | null;
  onHover: (id: number | null) => void; onSelect: (id: number) => void;
}
function ActorChart({ config, actors, effectiveId, lockedId, onHover, onSelect }: ActorChartProps) {
  const container = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [anchor, setAnchor] = useState<{ id: number; left: number; top: number; side: string } | null>(null);
  const data = useMemo(() => actors.map(actor => {
    const jitter = ((actor.id * 37) % 19) / 100 - 0.09;
    const clamp = (v: number) => Math.max(-9.9, Math.min(9.9, v));
    return { ...actor, x: clamp(actor[config.xKey] + jitter), y: clamp(actor[config.yKey] + jitter) };
  }), [actors, config]);
  const selected = data.find(actor => actor.id === effectiveId);
  useLayoutEffect(() => {
    if (!selected) { setAnchor(null); return; }
    const reposition = () => {
      const box = container.current?.getBoundingClientRect();
      const point = container.current?.querySelector('[data-actor-id="' + selected.id + '"] .actor-dot')?.getBoundingClientRect();
      const popup = label.current?.getBoundingClientRect();
      if (box && point && popup) setAnchor({ id: selected.id, ...floatingLabelPosition(point.x + point.width / 2 - box.x, point.y + point.height / 2 - box.y, box.width, box.height, popup.width, popup.height) });
    };
    const frame = requestAnimationFrame(reposition);
    return () => cancelAnimationFrame(frame);
  }, [selected?.id, selected?.name, selected?.count, width]);

  return <div className="bg-card rounded-2xl border p-3 sm:p-6 shadow-sm" data-chart={config.id}>
    <div className="mb-4"><h3 className="text-lg font-display font-bold">{config.title}</h3><p className="text-sm text-muted-foreground">{config.subtitle}</p></div>
    <div ref={container} className="relative w-full h-[360px] sm:h-[400px] font-sans">
      <ResponsiveContainer width="100%" height="100%" onResize={w => setWidth(w)}>
        <ScatterChart margin={{ top: 26, right: 12, bottom: 28, left: 12 }}>
          <ReferenceLine x={0} stroke="hsl(var(--border))" strokeOpacity={0.6} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeOpacity={0.6} />
          <XAxis type="number" dataKey="x" domain={[-10, 10]} tick={false} axisLine={false} width={0}>
            <Label value={config.left} position="insideLeft" offset={0} className="fill-muted-foreground text-[10px] sm:text-xs" />
            <Label value={config.right} position="insideRight" offset={0} className="fill-muted-foreground text-[10px] sm:text-xs" />
          </XAxis>
          <YAxis type="number" dataKey="y" domain={[-10, 10]} tick={false} axisLine={false} width={0} />
          <ZAxis type="number" dataKey="count" range={[60, 300]} />
          <Scatter data={data} isAnimationActive={false} shape={(props: any) => {
            const actor = props.payload as ChartActor;
            if (!actor || !Number.isFinite(props.cx) || !Number.isFinite(props.cy)) return <g />;
            const radius = Math.sqrt((props.size || 80) / Math.PI);
            const active = effectiveId === actor.id;
            return <g transform={'translate(' + props.cx + ',' + props.cy + ')'} role="button" tabIndex={0}
              data-actor-id={actor.id} data-cartography-point="true" aria-label={actor.name + ', ' + actor.count + ' publication' + (actor.count > 1 ? 's' : '')}
              aria-pressed={lockedId === actor.id} aria-describedby={active ? 'actor-tooltip-' + config.id : undefined}
              className="cursor-pointer outline-none focus-visible:[&_.actor-dot]:stroke-foreground"
              onPointerEnter={event => { if (event.pointerType !== "touch") onHover(actor.id); }}
              onPointerLeave={event => { if (event.pointerType !== "touch") onHover(null); }}
              onFocus={() => onHover(actor.id)} onBlur={() => onHover(null)}
              onClick={event => { event.stopPropagation(); onSelect(actor.id); }}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onSelect(actor.id); } }}>
              <circle r={Math.max(15, radius + 4)} fill="transparent" />
              <circle className="actor-dot" r={radius} fill={actorCategory(actor.actor_type).color} fillOpacity={active ? 1 : effectiveId !== null ? 0.2 : 0.75}
                stroke={active ? "hsl(var(--foreground))" : "transparent"} strokeWidth={active ? 2 : 0} pointerEvents="none" />
            </g>;
          }} />
        </ScatterChart>
      </ResponsiveContainer>
      <span className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none text-muted-foreground text-[10px] sm:text-xs">{config.top}</span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none text-muted-foreground text-[10px] sm:text-xs">{config.bottom}</span>
      {selected && <div ref={label} id={'actor-tooltip-' + config.id} role="tooltip" data-tooltip-actor={selected.id} data-side={anchor?.id === selected.id ? anchor.side : undefined}
        className="absolute z-20 pointer-events-none rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3 text-sm break-words"
        style={{ width: Math.min(208, Math.max(80, width / 2 - 20)), left: anchor?.left ?? 0, top: anchor?.top ?? 0, visibility: anchor?.id === selected.id ? "visible" : "hidden" }}>
        <p className="font-bold font-display leading-snug">{selected.name}</p><p className="mt-1 text-muted-foreground text-xs">{selected.count} publication{selected.count > 1 ? "s" : ""}</p>
      </div>}
    </div>
  </div>;
}

export function MediaCartography({ actorInTopic, articles }: MediaCartographyProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [lockedId, setLockedId] = useState<number | null>(null);
  const actors = useMemo(() => {
    const counts = new Map<number, number>();for (const article of articles) counts.set(article.actorId, (counts.get(article.actorId) ?? 0) + 1);
    return actorInTopic.filter(actor => counts.has(actor.id)).map(actor => ({ ...actor, count: counts.get(actor.id)! }));
  }, [actorInTopic, articles]);
  const clear = () => { setHoveredId(null); setLockedId(null); };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setHoveredId(null); setLockedId(null); } };
    const onOutside = (event: PointerEvent) => { if (!(event.target instanceof Element) || !event.target.closest("[data-cartography-point]")) { setHoveredId(null); setLockedId(null); } };
    window.addEventListener("keydown", onKey);document.addEventListener("pointerdown", onOutside);
    return () => { window.removeEventListener("keydown", onKey);document.removeEventListener("pointerdown", onOutside); };
  }, []);
  if (!actors.length) return <div className="h-[300px] flex items-center justify-center rounded-lg border border-dashed text-muted-foreground">Pas assez de données pour les cartographies</div>;
  return <section aria-labelledby="cartography-title">
    <div className="mb-3 flex items-center justify-between gap-3"><h2 id="cartography-title" className="text-2xl font-display font-bold">Cartographie des Médias</h2><Badge variant="secondary">{actors.length} sources</Badge></div>
    <ul aria-label="Légende des couleurs" className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground">
      {ACTOR_CATEGORIES.map(category => <li key={category.type} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} aria-hidden="true" />{category.label}</li>)}
    </ul>
    <div className="grid lg:grid-cols-2 gap-6">{CHARTS.map(config => <ActorChart key={config.id} config={config} actors={actors} effectiveId={lockedId ?? hoveredId} lockedId={lockedId} onHover={setHoveredId} onSelect={id => { if (lockedId === id) clear();else { setLockedId(id);setHoveredId(null); } }} />)}</div>
    <p className="mt-4 text-xs text-center text-muted-foreground">Survolez ou touchez un point pour identifier l’acteur. Cliquez pour garder sa fiche affichée ; cliquez ailleurs ou appuyez sur Échap pour la fermer.</p>
  </section>;
}
