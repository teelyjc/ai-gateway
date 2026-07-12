"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function TokensChart({
  data,
}: {
  data: { date: string; tokens: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="tokens" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#71717a" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#71717a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : `${v}`)}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e4e4e7",
              fontSize: 12,
            }}
            formatter={(value) => [(Number(value) || 0).toLocaleString(), "Tokens"]}
          />
          <Area
            type="monotone"
            dataKey="tokens"
            stroke="#71717a"
            strokeWidth={2}
            fill="url(#tokens)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
