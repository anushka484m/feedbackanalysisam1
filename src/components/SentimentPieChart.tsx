import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SentimentPieChartProps {
  data: { name: string; value: number; color: string }[];
}

const SentimentPieChart: React.FC<SentimentPieChartProps> = ({ data }) => {
  if (data.every(d => d.value === 0)) {
    return (
      <div className="data-card h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No sentiment data</p>
      </div>
    );
  }

  return (
    <div className="data-card">
      <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
        Sentiment Distribution
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(0 0% 100%)',
              border: '1px solid hsl(220 14% 90%)',
              borderRadius: '8px',
              color: 'hsl(220 25% 12%)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
            }}
          />
          <Legend
            formatter={(value) => <span style={{ color: 'hsl(220 25% 18%)', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentPieChart;
