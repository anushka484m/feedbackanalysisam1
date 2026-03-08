import React from 'react';
import { Lightbulb, ThumbsUp, ThumbsDown } from 'lucide-react';

interface InsightsPanelProps {
  topComplaints: string[];
  topPraises: string[];
  actionableInsights: string[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ topComplaints, topPraises, actionableInsights }) => {
  return (
    <div className="space-y-4">
      {/* Actionable Insights */}
      <div className="data-card">
        <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          Actionable Insights
        </h3>
        <div className="space-y-3">
          {actionableInsights.length > 0 ? actionableInsights.map((insight, i) => (
            <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30 border border-border">
              <span className="stat-badge bg-warning/10 text-warning shrink-0">{i + 1}</span>
              <p className="text-sm text-foreground/90">{insight}</p>
            </div>
          )) : (
            <p className="text-muted-foreground text-sm">Run analysis to generate insights</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Complaints */}
        <div className="data-card">
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <ThumbsDown className="h-4 w-4 text-destructive" />
            Top 5 Complaints
          </h3>
          <ol className="space-y-2">
            {topComplaints.length > 0 ? topComplaints.map((c, i) => (
              <li key={i} className="flex gap-2 items-start text-sm">
                <span className="text-destructive font-mono text-xs mt-0.5">{i + 1}.</span>
                <span className="text-foreground/80">{c}</span>
              </li>
            )) : (
              <li className="text-muted-foreground text-sm">No data yet</li>
            )}
          </ol>
        </div>

        {/* Top Praises */}
        <div className="data-card">
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-success" />
            Top 5 Praises
          </h3>
          <ol className="space-y-2">
            {topPraises.length > 0 ? topPraises.map((p, i) => (
              <li key={i} className="flex gap-2 items-start text-sm">
                <span className="text-success font-mono text-xs mt-0.5">{i + 1}.</span>
                <span className="text-foreground/80">{p}</span>
              </li>
            )) : (
              <li className="text-muted-foreground text-sm">No data yet</li>
            )}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;
