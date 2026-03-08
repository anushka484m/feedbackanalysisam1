import React, { useState } from 'react';
import type { FeedbackEntry, AnalysisResult } from '@/types/feedback';
import SentimentPieChart from './SentimentPieChart';
import TopicBarChart from './TopicBarChart';
import WordCloudDisplay from './WordCloudDisplay';
import TrendChart from './TrendChart';
import InsightsPanel from './InsightsPanel';
import AlertsTable from './AlertsTable';
import RegionHeatmap from './RegionHeatmap';
import { Button } from '@/components/ui/button';
import { FileText, Presentation, Loader2 } from 'lucide-react';
import { exportPDF, exportPPTX } from '@/lib/reportExport';
import { toast } from 'sonner';

interface AnalysisDashboardProps {
  entries: FeedbackEntry[];
  analysis: AnalysisResult | null;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ entries, analysis }) => {
  const [exporting, setExporting] = useState<'pdf' | 'pptx' | null>(null);

  if (!analysis) {
    return (
      <div className="data-card text-center py-16">
        <p className="text-muted-foreground">
          Process feedback entries first, then run analysis to see the dashboard.
        </p>
      </div>
    );
  }

  const handleExport = async (format: 'pdf' | 'pptx') => {
    setExporting(format);
    try {
      if (format === 'pdf') {
        await exportPDF(entries, analysis);
      } else {
        await exportPPTX(entries, analysis);
      }
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Export bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
          Analysis Dashboard
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={!!exporting}>
            {exporting === 'pdf' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pptx')} disabled={!!exporting}>
            {exporting === 'pptx' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Presentation className="h-3 w-3 mr-1" />}
            Export PPTX
          </Button>
        </div>
      </div>

      {/* Row 1: Sentiment + Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SentimentPieChart data={analysis.sentimentDistribution} />
        <TopicBarChart data={analysis.topicFrequency} />
      </div>

      {/* Row 2: Word Clouds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WordCloudDisplay
          words={analysis.positiveWords}
          title="Positive Keywords"
          colorClass="text-success"
        />
        <WordCloudDisplay
          words={analysis.negativeWords}
          title="Negative Keywords"
          colorClass="text-destructive"
        />
      </div>

      {/* Row 3: Regional Heatmap */}
      <RegionHeatmap data={analysis.trendsByRegion} />

      {/* Row 4: Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrendChart data={analysis.trendsByRegion} title="Sentiment by Region" />
        <TrendChart data={analysis.trendsBySource} title="Sentiment by Source" />
        <TrendChart data={analysis.trendsByLanguage} title="Sentiment by Language" />
      </div>

      {/* Row 5: Insights */}
      <InsightsPanel
        topComplaints={analysis.topComplaints}
        topPraises={analysis.topPraises}
        actionableInsights={analysis.actionableInsights}
      />

      {/* Row 6: Alerts */}
      <AlertsTable alerts={analysis.criticalAlerts} />
    </div>
  );
};

export default AnalysisDashboard;
