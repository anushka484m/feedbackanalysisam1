import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeedbackEntry, ProcessingStats, ExportFormat, AnalysisResult } from '@/types/feedback';
import UploadZone from '@/components/UploadZone';
import ProcessingPipeline from '@/components/ProcessingPipeline';
import DatasetView from '@/components/DatasetView';
import StatsBar from '@/components/StatsBar';
import AnalysisDashboard from '@/components/AnalysisDashboard';
import UserMenu from '@/components/UserMenu';
import { Database, Zap, BarChart3, Upload as UploadIcon, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth, canWrite } from '@/hooks/useAuth';
import { loadEntries, insertEntry, updateEntry, saveAnalysisRun, insertAlerts } from '@/lib/feedbackRepo';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];

function getFileType(name: string): 'text' | 'audio' | 'video' {
  const ext = name.toLowerCase().slice(name.lastIndexOf('.'));
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  return 'text';
}

function buildAnalysisResult(entries: FeedbackEntry[], insights: any): AnalysisResult {
  const completed = entries.filter(e => e.status === 'completed' && !e.isDuplicate);

  const sentimentCounts = { Positive: 0, Negative: 0, Neutral: 0 };
  const topicCounts: Record<string, number> = {};
  const trendsByRegion: Record<string, { positive: number; negative: number; neutral: number }> = {};
  const trendsBySource: Record<string, { positive: number; negative: number; neutral: number }> = {};
  const trendsByLanguage: Record<string, { positive: number; negative: number; neutral: number }> = {};
  const posWords: Record<string, number> = {};
  const negWords: Record<string, number> = {};

  for (const e of completed) {
    const s = e.sentiment || 'Neutral';
    sentimentCounts[s]++;
    topicCounts[e.topic || 'General'] = (topicCounts[e.topic || 'General'] || 0) + 1;

    const sKey = s.toLowerCase() as 'positive' | 'negative' | 'neutral';
    const region = e.region || 'Unknown';
    if (!trendsByRegion[region]) trendsByRegion[region] = { positive: 0, negative: 0, neutral: 0 };
    trendsByRegion[region][sKey]++;

    const src = e.source.replace('_', ' ');
    if (!trendsBySource[src]) trendsBySource[src] = { positive: 0, negative: 0, neutral: 0 };
    trendsBySource[src][sKey]++;

    const lang = e.language || 'unknown';
    if (!trendsByLanguage[lang]) trendsByLanguage[lang] = { positive: 0, negative: 0, neutral: 0 };
    trendsByLanguage[lang][sKey]++;

    if (e.keywords) {
      for (const kw of e.keywords) {
        if (s === 'Positive') posWords[kw] = (posWords[kw] || 0) + 1;
        if (s === 'Negative') negWords[kw] = (negWords[kw] || 0) + 1;
      }
    }
  }

  return {
    sentimentDistribution: [
      { name: 'Positive', value: sentimentCounts.Positive, color: 'hsl(142, 70%, 45%)' },
      { name: 'Neutral', value: sentimentCounts.Neutral, color: 'hsl(215, 12%, 55%)' },
      { name: 'Negative', value: sentimentCounts.Negative, color: 'hsl(0, 72%, 51%)' },
    ],
    topicFrequency: Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count),
    trendsByRegion,
    trendsBySource,
    trendsByLanguage,
    topComplaints: insights.topComplaints || [],
    topPraises: insights.topPraises || [],
    actionableInsights: insights.actionableInsights || [],
    positiveWords: Object.entries(posWords)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30),
    negativeWords: Object.entries(negWords)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30),
    criticalAlerts: completed.filter(e => (e.sentimentScore ?? 0) < -0.7),
  };
}

const Index: React.FC = () => {
  const { user, profile, roles } = useAuth();
  const writeAllowed = canWrite(roles);
  const orgId = profile?.org_id ?? null;

  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'analyze'>('process');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<{ label: string; description: string; status: 'idle' | 'active' | 'completed' }[]>([
    { label: 'Ingest Data', description: 'Accept and parse input files', status: 'idle' },
    { label: 'Detect Language', description: 'Identify original language of each entry', status: 'idle' },
    { label: 'Transcribe Audio/Video', description: 'Convert speech to text', status: 'idle' },
    { label: 'Translate to English', description: 'Uniform translation preserving context', status: 'idle' },
    { label: 'Extract Metadata', description: 'Source, region, timestamp extraction', status: 'idle' },
    { label: 'Deduplicate & Clean', description: 'Remove duplicates and filler content', status: 'idle' },
  ]);

  useEffect(() => {
    if (!orgId) return;
    loadEntries(orgId)
      .then(setEntries)
      .catch(err => { console.error(err); toast.error('Failed to load feedback'); });
  }, [orgId]);

  const stats: ProcessingStats = {
    total: entries.length,
    processed: entries.filter(e => e.status === 'completed').length,
    duplicates: entries.filter(e => e.isDuplicate).length,
    languages: entries.filter(e => e.status === 'completed').reduce((acc, e) => {
      acc[e.language] = (acc[e.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    sources: entries.filter(e => e.status === 'completed').reduce((acc, e) => {
      acc[e.source] = (acc[e.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  const updateStep = (index: number, status: 'idle' | 'active' | 'completed') => {
    setPipelineSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  const resetPipeline = () => {
    setPipelineSteps(prev => prev.map(s => ({ ...s, status: 'idle' as const })));
  };

  const handleTextPaste = useCallback((text: string, source: string) => {
    const newEntry: FeedbackEntry = {
      id: crypto.randomUUID(),
      originalText: text,
      translatedText: '',
      language: '',
      source: source as FeedbackEntry['source'],
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    setEntries(prev => [...prev, newEntry]);
    toast.success('Feedback added to queue');
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    const newEntries: FeedbackEntry[] = files.map(file => ({
      id: crypto.randomUUID(),
      originalText: '',
      translatedText: '',
      language: '',
      source: getFileType(file.name) === 'audio' ? 'call' as const : getFileType(file.name) === 'video' ? 'video' as const : 'other' as const,
      timestamp: new Date().toISOString(),
      fileName: file.name,
      status: 'pending' as const,
    }));
    setEntries(prev => [...prev, ...newEntries]);

    files.forEach((file, i) => {
      if (getFileType(file.name) === 'text') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setEntries(prev => prev.map(entry =>
            entry.id === newEntries[i].id ? { ...entry, originalText: text } : entry
          ));
        };
        reader.readAsText(file);
      }
    });

    toast.success(`${files.length} file(s) added to queue`);
  }, []);

  const processEntries = async () => {
    const pending = entries.filter(e => e.status === 'pending');
    if (pending.length === 0) {
      toast.error('No pending entries to process');
      return;
    }

    setIsProcessing(true);
    resetPipeline();

    try {
      updateStep(0, 'active');
      await new Promise(r => setTimeout(r, 500));
      updateStep(0, 'completed');
      updateStep(1, 'active');

      for (const entry of pending) {
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'processing' } : e));

        try {
          const { data, error } = await supabase.functions.invoke('process-feedback', {
            body: {
              text: entry.originalText,
              source: entry.source,
              existingTexts: entries
                .filter(e => e.status === 'completed')
                .map(e => e.translatedText),
            },
          });

          if (error) throw error;

          setEntries(prev => prev.map(e =>
            e.id === entry.id ? {
              ...e,
              translatedText: data.translatedText,
              language: data.language,
              region: data.region,
              isDuplicate: data.isDuplicate,
              status: 'completed',
            } : e
          ));
        } catch (err) {
          console.error('Processing error:', err);
          setEntries(prev => prev.map(e =>
            e.id === entry.id ? { ...e, status: 'error' } : e
          ));
        }
      }

      updateStep(1, 'completed');
      updateStep(2, 'completed');
      updateStep(3, 'active');
      await new Promise(r => setTimeout(r, 300));
      updateStep(3, 'completed');
      updateStep(4, 'active');
      await new Promise(r => setTimeout(r, 300));
      updateStep(4, 'completed');
      updateStep(5, 'active');
      await new Promise(r => setTimeout(r, 300));
      updateStep(5, 'completed');

      toast.success('Processing complete!');
    } catch (err) {
      console.error(err);
      toast.error('Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const runAnalysis = async () => {
    const completed = entries.filter(e => e.status === 'completed' && !e.isDuplicate);
    if (completed.length === 0) {
      toast.error('No processed entries to analyze');
      return;
    }

    setIsAnalyzing(true);
    toast.info('Running sentiment analysis & generating insights...');

    try {
      const { data, error } = await supabase.functions.invoke('analyze-feedback', {
        body: {
          entries: completed.map(e => ({
            id: e.id,
            translatedText: e.translatedText,
            originalText: e.originalText,
            source: e.source,
            language: e.language,
            region: e.region,
            timestamp: e.timestamp,
          })),
        },
      });

      if (error) throw error;

      // Update entries with analysis data
      const analyzed = data.analyzedEntries || [];
      setEntries(prev => prev.map(e => {
        const match = analyzed.find((a: any) => a.id === e.id);
        if (match) {
          return {
            ...e,
            sentiment: match.sentiment,
            sentimentScore: match.sentimentScore,
            topic: match.topic,
            keywords: match.keywords,
          };
        }
        return e;
      }));

      // Build analysis result from updated entries
      const updatedEntries = entries.map(e => {
        const match = analyzed.find((a: any) => a.id === e.id);
        return match ? { ...e, ...match } : e;
      });
      
      const result = buildAnalysisResult(updatedEntries, data.insights || {});
      setAnalysis(result);
      setActiveTab('analyze');
      toast.success('Analysis complete!');
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = (format: ExportFormat) => {
    const completed = entries.filter(e => e.status === 'completed' && !e.isDuplicate);
    if (completed.length === 0) {
      toast.error('No data to export');
      return;
    }

    let content: string;
    let mimeType: string;
    let fileName: string;

    if (format === 'json') {
      const exportData = completed.map(e => ({
        source: e.source,
        original_language: e.language,
        translated_text: e.translatedText,
        original_text: e.originalText,
        sentiment: e.sentiment || null,
        sentiment_score: e.sentimentScore ?? null,
        topic: e.topic || null,
        keywords: e.keywords || [],
        timestamp: e.timestamp,
        region: e.region || null,
      }));
      content = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
      fileName = 'feedback_dataset.json';
    } else {
      const headers = ['source', 'original_language', 'translated_text', 'original_text', 'sentiment', 'sentiment_score', 'topic', 'keywords', 'timestamp', 'region'];
      const rows = completed.map(e =>
        [
          e.source,
          e.language,
          `"${e.translatedText.replace(/"/g, '""')}"`,
          `"${e.originalText.replace(/"/g, '""')}"`,
          e.sentiment || '',
          e.sentimentScore ?? '',
          e.topic || '',
          `"${(e.keywords || []).join('; ')}"`,
          e.timestamp,
          e.region || '',
        ].join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      fileName = 'feedback_dataset.csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const completedCount = entries.filter(e => e.status === 'completed' && !e.isDuplicate).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold font-mono tracking-tight">
                <span className="glow-text">Feedback</span> Processor
              </h1>
              <p className="text-xs text-muted-foreground">AI-powered multilingual data pipeline & analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab Buttons */}
            <div className="flex bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('process')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'process'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UploadIcon className="h-3.5 w-3.5" /> Process
              </button>
              <button
                onClick={() => setActiveTab('analyze')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'analyze'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Analyze
              </button>
            </div>

            {pendingCount > 0 && activeTab === 'process' && (
              <Button onClick={processEntries} disabled={isProcessing}>
                <Zap className="h-4 w-4 mr-2" />
                {isProcessing ? 'Processing...' : `Process ${pendingCount}`}
              </Button>
            )}
            {completedCount > 0 && activeTab === 'analyze' && (
              <Button onClick={runAnalysis} disabled={isAnalyzing}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {isAnalyzing ? 'Analyzing...' : `Analyze ${completedCount} entries`}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {activeTab === 'process' ? (
          <>
            <StatsBar stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <UploadZone onFilesSelected={handleFilesSelected} onTextPaste={handleTextPaste} />
                <DatasetView entries={entries} onExport={handleExport} />
              </div>
              <div>
                <ProcessingPipeline steps={pipelineSteps} />
              </div>
            </div>
          </>
        ) : (
          <AnalysisDashboard entries={entries} analysis={analysis} />
        )}
      </main>
    </div>
  );
};

export default Index;
