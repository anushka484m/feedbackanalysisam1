import React from 'react';
import type { FeedbackEntry, ExportFormat } from '@/types/feedback';
import { Download, Globe, MessageSquare, Hash, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DatasetViewProps {
  entries: FeedbackEntry[];
  onExport: (format: ExportFormat) => void;
}

const SentimentBadge: React.FC<{ sentiment?: string; score?: number }> = ({ sentiment, score }) => {
  if (!sentiment) return <span className="text-muted-foreground text-xs">—</span>;

  const config = {
    Positive: { bg: 'bg-success/15', text: 'text-success', icon: TrendingUp },
    Negative: { bg: 'bg-destructive/15', text: 'text-destructive', icon: TrendingDown },
    Neutral: { bg: 'bg-muted', text: 'text-muted-foreground', icon: Minus },
  }[sentiment] || { bg: 'bg-muted', text: 'text-muted-foreground', icon: Minus };

  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`stat-badge ${config.bg} ${config.text}`}>
        <Icon className="h-3 w-3" />
        {sentiment}
      </span>
      {score !== undefined && (
        <span className={`text-xs font-mono ${config.text} text-center`}>
          {score > 0 ? '+' : ''}{score.toFixed(2)}
        </span>
      )}
    </div>
  );
};

const DatasetView: React.FC<DatasetViewProps> = ({ entries, onExport }) => {
  const completed = entries.filter(e => e.status === 'completed' && !e.isDuplicate);

  if (completed.length === 0) {
    return (
      <div className="data-card text-center py-12">
        <Hash className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No processed entries yet</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Upload feedback to begin processing</p>
      </div>
    );
  }

  const hasAnalysis = completed.some(e => e.sentiment);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
          Structured Dataset ({completed.length} entries)
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onExport('csv')}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport('json')}>
            <Download className="h-3 w-3 mr-1" /> JSON
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Language</th>
              <th className="text-left p-3 min-w-[250px]">Translated Text</th>
              {hasAnalysis && (
                <>
                  <th className="text-left p-3">Sentiment</th>
                  <th className="text-left p-3">Topic</th>
                  <th className="text-left p-3">Keywords</th>
                </>
              )}
              <th className="text-left p-3">Region</th>
              <th className="text-left p-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {completed.map((entry, i) => (
              <tr key={entry.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                <td className="p-3">
                  <span className="stat-badge bg-secondary text-secondary-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {entry.source.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3">
                  <span className="stat-badge bg-primary/10 text-primary">
                    <Globe className="h-3 w-3" />
                    {entry.language}
                  </span>
                </td>
                <td className="p-3 text-foreground/90 max-w-md">
                  <p className="line-clamp-2">{entry.translatedText}</p>
                  {entry.originalText !== entry.translatedText && (
                    <p className="text-xs text-muted-foreground/60 mt-1 italic line-clamp-1">
                      Original: {entry.originalText}
                    </p>
                  )}
                </td>
                {hasAnalysis && (
                  <>
                    <td className="p-3">
                      <SentimentBadge sentiment={entry.sentiment} score={entry.sentimentScore} />
                    </td>
                    <td className="p-3">
                      {entry.topic ? (
                        <span className="stat-badge bg-accent/50 text-accent-foreground text-xs">
                          {entry.topic}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {(entry.keywords || []).slice(0, 3).map((kw, ki) => (
                          <span key={ki} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </td>
                  </>
                )}
                <td className="p-3 text-muted-foreground">{entry.region || '—'}</td>
                <td className="p-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DatasetView;
