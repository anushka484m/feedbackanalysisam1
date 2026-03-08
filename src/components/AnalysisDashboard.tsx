import React from 'react';
import type { FeedbackEntry, AnalysisResult } from '@/types/feedback';
import SentimentPieChart from './SentimentPieChart';
import TopicBarChart from './TopicBarChart';
import WordCloudDisplay from './WordCloudDisplay';
import TrendChart from './TrendChart';
import InsightsPanel from './InsightsPanel';
import AlertsTable from './AlertsTable';

interface AnalysisDashboardProps {
  entries: FeedbackEntry[];
  analysis: AnalysisResult | null;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ entries, analysis }) => {
  if (!analysis) {
    return (
      <div className="data-card text-center py-16">
        <p className="text-muted-foreground">
          Process feedback entries first, then run analysis to see the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
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

      {/* Row 3: Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrendChart data={analysis.trendsByRegion} title="Sentiment by Region" />
        <TrendChart data={analysis.trendsBySource} title="Sentiment by Source" />
        <TrendChart data={analysis.trendsByLanguage} title="Sentiment by Language" />
      </div>

      {/* Row 4: Insights */}
      <InsightsPanel
        topComplaints={analysis.topComplaints}
        topPraises={analysis.topPraises}
        actionableInsights={analysis.actionableInsights}
      />

      {/* Row 5: Alerts */}
      <AlertsTable alerts={analysis.criticalAlerts} />
    </div>
  );
};

export default AnalysisDashboard;
