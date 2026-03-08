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
  // Analysis fields
  sentiment?: 'Positive' | 'Negative' | 'Neutral';
  sentimentScore?: number; // -1 to +1
  topic?: string;
  keywords?: string[];
}

export interface ProcessingStats {
  total: number;
  processed: number;
  duplicates: number;
  languages: Record<string, number>;
  sources: Record<string, number>;
}

export interface AnalysisResult {
  sentimentDistribution: { name: string; value: number; color: string }[];
  topicFrequency: { topic: string; count: number }[];
  trendsByRegion: Record<string, { positive: number; negative: number; neutral: number }>;
  trendsBySource: Record<string, { positive: number; negative: number; neutral: number }>;
  trendsByLanguage: Record<string, { positive: number; negative: number; neutral: number }>;
  topComplaints: string[];
  topPraises: string[];
  actionableInsights: string[];
  positiveWords: { text: string; value: number }[];
  negativeWords: { text: string; value: number }[];
  criticalAlerts: FeedbackEntry[];
}

export type ExportFormat = 'csv' | 'json';
