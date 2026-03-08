import React from 'react';
import type { ProcessingStats } from '@/types/feedback';
import { FileText, Languages, Copy, Activity } from 'lucide-react';

interface StatsBarProps {
  stats: ProcessingStats;
}

const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  const topLanguages = Object.entries(stats.languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="data-card">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <FileText className="h-4 w-4" />
          <span className="text-xs font-mono uppercase">Total</span>
        </div>
        <p className="text-2xl font-bold font-mono glow-text">{stats.total}</p>
      </div>
      <div className="data-card">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Activity className="h-4 w-4" />
          <span className="text-xs font-mono uppercase">Processed</span>
        </div>
        <p className="text-2xl font-bold font-mono text-success">{stats.processed}</p>
      </div>
      <div className="data-card">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Copy className="h-4 w-4" />
          <span className="text-xs font-mono uppercase">Duplicates</span>
        </div>
        <p className="text-2xl font-bold font-mono text-warning">{stats.duplicates}</p>
      </div>
      <div className="data-card">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Languages className="h-4 w-4" />
          <span className="text-xs font-mono uppercase">Languages</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {topLanguages.length > 0 ? topLanguages.map(([lang, count]) => (
            <span key={lang} className="stat-badge bg-primary/10 text-primary text-xs">
              {lang} ({count})
            </span>
          )) : (
            <span className="text-muted-foreground text-sm font-mono">—</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
