"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface TrendPoint {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

export function MonthlyTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="card">
      <h3>Tendencia mensual</h3>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="income" stroke="#3d63dd" strokeWidth={2} />
            <Line type="monotone" dataKey="expenses" stroke="#d14b61" strokeWidth={2} />
            <Line type="monotone" dataKey="profit" stroke="#2b9961" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
