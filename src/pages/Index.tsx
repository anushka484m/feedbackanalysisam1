import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeedbackEntry, ProcessingStats, ExportFormat } from '@/types/feedback';
import UploadZone from '@/components/UploadZone';
import ProcessingPipeline from '@/components/ProcessingPipeline';
import DatasetView from '@/components/DatasetView';
import StatsBar from '@/components/StatsBar';
import { Database, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];

function getFileType(name: string): 'text' | 'audio' | 'video' {
  const ext = name.toLowerCase().slice(name.lastIndexOf('.'));
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  return 'text';
}

const Index: React.FC = () => {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState([
    { label: 'Ingest Data', description: 'Accept and parse input files', status: 'idle' as const },
    { label: 'Detect Language', description: 'Identify original language of each entry', status: 'idle' as const },
    { label: 'Transcribe Audio/Video', description: 'Convert speech to text', status: 'idle' as const },
    { label: 'Translate to English', description: 'Uniform translation preserving context', status: 'idle' as const },
    { label: 'Extract Metadata', description: 'Source, region, timestamp extraction', status: 'idle' as const },
    { label: 'Deduplicate & Clean', description: 'Remove duplicates and filler content', status: 'idle' as const },
  ]);

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

    // Read text files
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
      // Step 1: Ingest
      updateStep(0, 'active');
      await new Promise(r => setTimeout(r, 500));
      updateStep(0, 'completed');

      // Step 2: Language Detection
      updateStep(1, 'active');

      // Step 3-6: Process via edge function
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
        timestamp: e.timestamp,
        region: e.region || null,
      }));
      content = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
      fileName = 'feedback_dataset.json';
    } else {
      const headers = ['source', 'original_language', 'translated_text', 'original_text', 'timestamp', 'region'];
      const rows = completed.map(e =>
        [e.source, e.language, `"${e.translatedText.replace(/"/g, '""')}"`, `"${e.originalText.replace(/"/g, '""')}"`, e.timestamp, e.region || ''].join(',')
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold font-mono tracking-tight">
                <span className="glow-text">Feedback</span> Processor
              </h1>
              <p className="text-xs text-muted-foreground">AI-powered multilingual data pipeline</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <Button onClick={processEntries} disabled={isProcessing}>
              <Zap className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : `Process ${pendingCount} entries`}
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
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
      </main>
    </div>
  );
};

export default Index;
