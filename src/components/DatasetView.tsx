import React from 'react';
import type { FeedbackEntry, ExportFormat } from '@/types/feedback';
import { Download, Globe, MessageSquare, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DatasetViewProps {
  entries: FeedbackEntry[];
  onExport: (format: ExportFormat) => void;
}

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
              <th className="text-left p-3 min-w-[300px]">Translated Text</th>
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
                <td className="p-3 text-foreground/90 max-w-md">{entry.translatedText}</td>
                <td className="p-3 text-muted-foreground">{entry.region || '—'}</td>
                <td className="p-3 text-muted-foreground font-mono text-xs">{entry.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DatasetView;
