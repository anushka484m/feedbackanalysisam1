import React from 'react';
import { MapPin } from 'lucide-react';

interface RegionHeatmapProps {
  data: Record<string, { positive: number; negative: number; neutral: number }>;
}

const RegionHeatmap: React.FC<RegionHeatmapProps> = ({ data }) => {
  const regions = Object.entries(data).map(([name, vals]) => {
    const total = vals.positive + vals.negative + vals.neutral;
    const avgSentiment = total > 0
      ? (vals.positive - vals.negative) / total
      : 0;
    return { name, ...vals, total, avgSentiment };
  }).sort((a, b) => b.total - a.total);

  if (regions.length === 0) {
    return (
      <div className="data-card text-center py-12">
        <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No regional data available</p>
      </div>
    );
  }

  const maxTotal = Math.max(...regions.map(r => r.total));

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'bg-success/20 border-success/40';
    if (score < -0.3) return 'bg-destructive/20 border-destructive/40';
    return 'bg-warning/20 border-warning/40';
  };

  const getSentimentText = (score: number) => {
    if (score > 0.3) return 'text-success';
    if (score < -0.3) return 'text-destructive';
    return 'text-warning';
  };

  return (
    <div className="data-card">
      <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        Regional Sentiment Heatmap
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {regions.map((region) => (
          <div
            key={region.name}
            className={`rounded-lg border p-3 transition-all hover:scale-[1.02] ${getSentimentColor(region.avgSentiment)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium text-foreground truncate">{region.name}</span>
              <span className={`text-xs font-mono font-bold ${getSentimentText(region.avgSentiment)}`}>
                {region.avgSentiment > 0 ? '+' : ''}{region.avgSentiment.toFixed(2)}
              </span>
            </div>

            {/* Intensity bar */}
            <div className="w-full h-1.5 bg-background/50 rounded-full mb-2">
              <div
                className="h-full rounded-full bg-foreground/30"
                style={{ width: `${(region.total / maxTotal) * 100}%` }}
              />
            </div>

            <div className="flex justify-between text-xs font-mono">
              <span className="text-success">{region.positive}↑</span>
              <span className="text-muted-foreground">{region.neutral}—</span>
              <span className="text-destructive">{region.negative}↓</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{region.total} total</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-success/20 border border-success/40" /> Positive (&gt;0.3)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-warning/20 border border-warning/40" /> Mixed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40" /> Negative (&lt;-0.3)
        </span>
      </div>
    </div>
  );
};

export default RegionHeatmap;
