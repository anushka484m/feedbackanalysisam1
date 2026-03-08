import React from 'react';
import type { FeedbackEntry } from '@/types/feedback';
import { AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AlertsTableProps {
  alerts: FeedbackEntry[];
}

const AlertsTable: React.FC<AlertsTableProps> = ({ alerts }) => {
  const exportAlerts = (format: 'csv' | 'json') => {
    if (alerts.length === 0) return;

    const data = alerts.map(a => ({
      id: a.id,
      source: a.source,
      language: a.language,
      sentiment_score: a.sentimentScore,
      topic: a.topic,
      translated_text: a.translatedText,
      original_text: a.originalText,
      region: a.region || null,
      timestamp: a.timestamp,
    }));

    let content: string;
    let mimeType: string;
    let fileName: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      fileName = 'critical_alerts.json';
    } else {
      const headers = Object.keys(data[0]);
      const rows = data.map(d => headers.map(h => {
        const val = (d as any)[h];
        return typeof val === 'string' && val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val ?? '';
      }).join(','));
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      fileName = 'critical_alerts.csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Alerts exported as ${format.toUpperCase()}`);
  };

  return (
    <div className="data-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono uppercase tracking-wider text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Critical Alerts ({alerts.length})
          <span className="text-xs text-muted-foreground font-normal normal-case tracking-normal ml-2">
            Sentiment score &lt; -0.7
          </span>
        </h3>
        {alerts.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportAlerts('csv')}>
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAlerts('json')}>
              <Download className="h-3 w-3 mr-1" /> JSON
            </Button>
          </div>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-6">
          No critical alerts — all feedback above -0.7 threshold
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-destructive/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left p-3">Score</th>
                <th className="text-left p-3">Topic</th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3 min-w-[300px]">Feedback</th>
                <th className="text-left p-3">Region</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((entry) => (
                <tr key={entry.id} className="border-t border-border hover:bg-destructive/5 transition-colors">
                  <td className="p-3">
                    <span className="stat-badge bg-destructive/15 text-destructive font-mono">
                      {entry.sentimentScore?.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 text-foreground/80">{entry.topic}</td>
                  <td className="p-3 text-muted-foreground">{entry.source.replace('_', ' ')}</td>
                  <td className="p-3 text-foreground/90 max-w-md">{entry.translatedText}</td>
                  <td className="p-3 text-muted-foreground">{entry.region || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AlertsTable;
