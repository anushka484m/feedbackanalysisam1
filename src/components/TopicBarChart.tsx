import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TopicBarChartProps {
  data: { topic: string; count: number }[];
}

const COLORS = [
  'hsl(175, 80%, 48%)',
  'hsl(200, 70%, 50%)',
  'hsl(260, 60%, 55%)',
  'hsl(330, 65%, 50%)',
  'hsl(38, 92%, 50%)',
  'hsl(142, 70%, 45%)',
  'hsl(0, 72%, 51%)',
  'hsl(45, 80%, 55%)',
  'hsl(280, 60%, 50%)',
];

const TopicBarChart: React.FC<TopicBarChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="data-card h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No topic data</p>
      </div>
    );
  }

  return (
    <div className="data-card">
      <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
        Topics by Frequency
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <XAxis type="number" tick={{ fill: 'hsl(215, 12%, 55%)', fontFamily: 'JetBrains Mono', fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="topic"
            width={120}
            tick={{ fill: 'hsl(210, 20%, 85%)', fontFamily: 'JetBrains Mono', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(220 18% 10%)',
              border: '1px solid hsl(220 14% 18%)',
              borderRadius: '8px',
              color: 'hsl(210 20% 92%)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopicBarChart;
