"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { portfolioSeries } from "@/lib/data";

export function PortfolioChart() {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={portfolioSeries}>
          <defs>
            <linearGradient id="portfolio" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#68f1c4" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#68f1c4" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8 }}
          />
          <Area dataKey="value" stroke="#68f1c4" fill="url(#portfolio)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

