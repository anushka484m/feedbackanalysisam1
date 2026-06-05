import { supabase } from '@/integrations/supabase/client';
import type { FeedbackEntry } from '@/types/feedback';

type Row = any;

const rowToEntry = (r: Row): FeedbackEntry => ({
  id: r.id,
  originalText: r.original_text ?? '',
  translatedText: r.translated_text ?? '',
  language: r.language ?? '',
  source: (r.source ?? 'other') as FeedbackEntry['source'],
  timestamp: r.timestamp ?? r.created_at,
  region: r.region ?? undefined,
  fileName: r.file_name ?? undefined,
  status: r.status ?? 'pending',
  isDuplicate: r.is_duplicate ?? false,
  sentiment: r.sentiment ?? undefined,
  sentimentScore: r.sentiment_score != null ? Number(r.sentiment_score) : undefined,
  topic: r.topic ?? undefined,
  keywords: r.keywords ?? undefined,
});

export async function loadEntries(orgId: string): Promise<FeedbackEntry[]> {
  const { data, error } = await supabase
    .from('feedback_entries')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToEntry);
}

export async function insertEntry(orgId: string, userId: string, entry: FeedbackEntry): Promise<FeedbackEntry> {
  const { data, error } = await supabase
    .from('feedback_entries')
    .insert({
      org_id: orgId,
      created_by: userId,
      original_text: entry.originalText || '',
      translated_text: entry.translatedText || null,
      language: entry.language || null,
      source: entry.source,
      region: entry.region ?? null,
      file_name: entry.fileName ?? null,
      status: entry.status,
      timestamp: entry.timestamp,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToEntry(data);
}

export async function updateEntry(id: string, patch: Partial<FeedbackEntry>): Promise<void> {
  const dbPatch: Row = {};
  if (patch.originalText !== undefined) dbPatch.original_text = patch.originalText;
  if (patch.translatedText !== undefined) dbPatch.translated_text = patch.translatedText;
  if (patch.language !== undefined) dbPatch.language = patch.language;
  if (patch.region !== undefined) dbPatch.region = patch.region;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.isDuplicate !== undefined) dbPatch.is_duplicate = patch.isDuplicate;
  if (patch.sentiment !== undefined) dbPatch.sentiment = patch.sentiment;
  if (patch.sentimentScore !== undefined) dbPatch.sentiment_score = patch.sentimentScore;
  if (patch.topic !== undefined) dbPatch.topic = patch.topic;
  if (patch.keywords !== undefined) dbPatch.keywords = patch.keywords;
  if (Object.keys(dbPatch).length === 0) return;
  const { error } = await supabase.from('feedback_entries').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function saveAnalysisRun(orgId: string, userId: string, result: any, entryCount: number) {
  const { error } = await supabase.from('analysis_runs').insert({
    org_id: orgId,
    created_by: userId,
    entry_count: entryCount,
    result,
  });
  if (error) throw error;
}

export async function insertAlerts(orgId: string, entries: FeedbackEntry[]) {
  const rows = entries
    .filter(e => (e.sentimentScore ?? 0) < -0.7)
    .map(e => ({
      org_id: orgId,
      feedback_id: e.id,
      reason: `Critical sentiment (${e.sentimentScore?.toFixed(2)}) on topic "${e.topic ?? 'General'}"`,
      severity: 'critical' as const,
    }));
  if (rows.length === 0) return;
  await supabase.from('alerts').insert(rows);
}
