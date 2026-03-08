import React, { useCallback, useState } from 'react';
import { Upload, FileText, Mic, Video, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onTextPaste: (text: string, source: string) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, onTextPaste }) => {
  const [dragging, setDragging] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [textSource, setTextSource] = useState('email');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFilesSelected(files);
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onFilesSelected(files);
  }, [onFilesSelected]);

  const handleTextSubmit = () => {
    if (pastedText.trim()) {
      onTextPaste(pastedText.trim(), textSource);
      setPastedText('');
      setShowTextInput(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".txt,.csv,.json,.mp3,.wav,.m4a,.mp4,.webm,.ogg"
          className="hidden"
          onChange={handleFileInput}
        />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-foreground font-medium mb-1">Drop files here or click to upload</p>
        <p className="text-muted-foreground text-sm">
          Text (.txt, .csv, .json) · Audio (.mp3, .wav, .m4a) · Video (.mp4, .webm)
        </p>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="stat-badge bg-secondary"><FileText className="h-3 w-3" /> Text</span>
          <span className="stat-badge bg-secondary"><Mic className="h-3 w-3" /> Audio</span>
          <span className="stat-badge bg-secondary"><Video className="h-3 w-3" /> Video</span>
        </div>
      </div>

      {!showTextInput ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={(e) => { e.stopPropagation(); setShowTextInput(true); }}
        >
          <Plus className="h-4 w-4 mr-2" /> Paste text feedback manually
        </Button>
      ) : (
        <div className="data-card space-y-3 animate-slide-up">
          <div className="flex gap-2">
            {['email', 'social_media', 'chat', 'other'].map((src) => (
              <button
                key={src}
                onClick={() => setTextSource(src)}
                className={`stat-badge transition-colors ${textSource === src ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
              >
                {src.replace('_', ' ')}
              </button>
            ))}
          </div>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste customer feedback here (emails, chat logs, social media posts)..."
            className="w-full h-32 bg-muted border border-border rounded-lg p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button onClick={handleTextSubmit} disabled={!pastedText.trim()}>
              Add Feedback
            </Button>
            <Button variant="ghost" onClick={() => setShowTextInput(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
