"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#111111", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"];

export function ModelDonut({
  data,
  dataKey = "spend",
}: {
  data: { model: string; spend: number; est_cost?: number }[];
  dataKey?: string;
}) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey="model"
            innerRadius={48}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e4e4e7",
              fontSize: 12,
            }}
            formatter={(value) => [`$${(Number(value) || 0).toFixed(2)}`, "Spend"]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KeyBars({
  data,
  dataKey = "spend",
}: {
  data: { key: string; spend: number; est_cost?: number }[];
  dataKey?: string;
}) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          <XAxis
            dataKey="key"
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e4e4e7",
              fontSize: 12,
            }}
            formatter={(value) => [`$${(Number(value) || 0).toFixed(4)}`, "Cost"]}
          />
          <Bar dataKey={dataKey} fill="#111111" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
