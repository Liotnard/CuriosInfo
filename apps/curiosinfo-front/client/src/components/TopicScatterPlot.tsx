import { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ReferenceLine, Label } from 'recharts';
//import { Actor } from "@shared/schema";
import { Actor } from "@shared/contracts";
import { Card } from "@/components/ui/card";

interface TopicScatterPlotProps {
  actorInTopic: Actor[];
  articles: { actorId: number }[];
}

export function TopicScatterPlot({ actorInTopic, articles }: TopicScatterPlotProps) {
  const data = useMemo(() => {
    // Count articles per actor
    const counts = articles.reduce((acc, curr) => {
      acc[curr.actorId] = (acc[curr.actorId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return actorInTopic.map(m => ({
      ...m,
      count: counts[m.id] || 0,
      // Random jitter to prevent exact overlap if coordinates are identical
      //x: m.axisX + (Math.random() * 0.2 - 0.1), 
      //y: m.axisY + (Math.random() * 0.2 - 0.1),
    })).filter(item => item.count > 0);
  }, [actorInTopic, articles]);

  if (data.length === 0) {
    return (
      <Card className="h-[300px] flex items-center justify-center bg-muted/20 border-dashed">
        <p className="text-muted-foreground text-sm">Pas assez de données pour le graphique</p>
      </Card>
    );
  }

  return (
    <div className="w-full h-[400px] font-sans">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          {/* Quadrant Lines */}
          <ReferenceLine x={0} stroke="hsl(var(--border))" />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Economique" 
            domain={[-10, 10]} 
            tick={false} 
            axisLine={false}
          >
            <Label value="Gauche" offset={0} position="insideLeft" className="fill-muted-foreground text-xs font-medium" />
            <Label value="Droite" offset={0} position="insideRight" className="fill-muted-foreground text-xs font-medium" />
          </XAxis>
          
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Sociétal" 
            domain={[-10, 10]} 
            tick={false} 
            axisLine={false}
          >
            <Label value="Progressiste" offset={10} position="insideTop" className="fill-muted-foreground text-xs font-medium" />
            <Label value="Conservateur" offset={10} position="insideBottom" className="fill-muted-foreground text-xs font-medium" />
          </YAxis>
          
          <ZAxis type="number" dataKey="count" range={[60, 400]} name="Articles" />
          
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border shadow-lg rounded-lg p-3 text-sm">
                    <p className="font-bold font-display">{data.name}</p>
                    <p className="text-muted-foreground">{data.count} article{data.count > 1 ? 's' : ''}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          
          <Scatter name="Actor" data={data} fill="hsl(var(--primary))">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="hsl(var(--primary))" fillOpacity={0.7} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
