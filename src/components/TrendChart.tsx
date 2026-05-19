import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendChartProps {
  data: Record<string, { positive: number; negative: number; neutral: number }>;
  title: string;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, title }) => {
  const chartData = Object.entries(data).map(([name, vals]) => ({
    name,
    ...vals,
  }));

  if (chartData.length === 0) {
    return (
      <div className="data-card h-[280px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No trend data</p>
      </div>
    );
  }

  return (
    <div className="data-card">
      <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <XAxis
            dataKey="name"
            tick={{ fill: 'hsl(210, 20%, 85%)', fontFamily: 'JetBrains Mono', fontSize: 10 }}
            angle={-25}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fill: 'hsl(215, 12%, 55%)', fontFamily: 'JetBrains Mono', fontSize: 11 }} />
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
            formatter={(value) => <span style={{ color: 'hsl(220 25% 18%)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>{value}</span>}
          />
          <Bar dataKey="positive" fill="hsl(142, 70%, 45%)" radius={[2, 2, 0, 0]} stackId="a" />
          <Bar dataKey="neutral" fill="hsl(215, 12%, 55%)" radius={[0, 0, 0, 0]} stackId="a" />
          <Bar dataKey="negative" fill="hsl(0, 72%, 51%)" radius={[0, 0, 2, 2]} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
