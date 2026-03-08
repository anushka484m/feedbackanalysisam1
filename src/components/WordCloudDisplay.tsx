import React from 'react';

interface WordCloudProps {
  words: { text: string; value: number }[];
  title: string;
  colorClass: string;
}

const WordCloudDisplay: React.FC<WordCloudProps> = ({ words, title, colorClass }) => {
  if (words.length === 0) {
    return (
      <div className="data-card h-[200px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No data</p>
      </div>
    );
  }

  const maxVal = Math.max(...words.map(w => w.value), 1);

  return (
    <div className="data-card">
      <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2 justify-center min-h-[140px] items-center">
        {words.map((word, i) => {
          const scale = 0.7 + (word.value / maxVal) * 1.3;
          const opacity = 0.5 + (word.value / maxVal) * 0.5;
          return (
            <span
              key={i}
              className={`font-mono font-semibold transition-all hover:scale-110 cursor-default ${colorClass}`}
              style={{
                fontSize: `${Math.max(12, scale * 16)}px`,
                opacity,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default WordCloudDisplay;
