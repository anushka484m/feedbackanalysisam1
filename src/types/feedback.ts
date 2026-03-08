export interface FeedbackEntry {
  id: string;
  originalText: string;
  translatedText: string;
  language: string;
  source: 'email' | 'social_media' | 'call' | 'voice_note' | 'video' | 'chat' | 'other';
  timestamp: string;
  region?: string;
  fileName?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  isDuplicate?: boolean;
}

export interface ProcessingStats {
  total: number;
  processed: number;
  duplicates: number;
  languages: Record<string, number>;
  sources: Record<string, number>;
}

export type ExportFormat = 'csv' | 'json';
