"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { generatePriceHistory } from "@/data/mock-markets"

interface OddsChartProps {
  startProb: number
  endProb: number
  days?: number
}

export function OddsChart({ startProb, endProb, days = 30 }: OddsChartProps) {
  const data = useMemo(
    () => generatePriceHistory(startProb, endProb, days),
    [startProb, endProb, days]
  )

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.6 0.2 160)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.6 0.2 160)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="oklch(0.3 0 0 / 0.2)"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val: string) => {
              const d = new Date(val)
              return `${d.getMonth() + 1}/${d.getDate()}`
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "oklch(0.6 0 0)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val: number) => `${val}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "oklch(0.16 0.005 260)",
              border: "1px solid oklch(0.24 0.01 260)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "oklch(0.95 0 0)",
            }}
            formatter={(value: number, name: string) => [
              `${value}%`,
              name === "yes" ? "Yes" : "No",
            ]}
            labelFormatter={(label: string) => {
              const d = new Date(label)
              return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }}
          />
          <Area
            type="monotone"
            dataKey="yes"
            stroke="oklch(0.6 0.2 160)"
            strokeWidth={2}
            fill="url(#yesGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
