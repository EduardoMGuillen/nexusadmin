"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#3d63dd", "#2b9961"];

export function IncomeSplitChart({
  recurrent,
  oneTime,
}: {
  recurrent: number;
  oneTime: number;
}) {
  const data = [
    { name: "Recurrente", value: recurrent },
    { name: "One-time", value: oneTime },
  ];
  return (
    <div className="card">
      <h3>Distribucion ingresos</h3>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88}>
              {data.map((entry, idx) => (
                <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
