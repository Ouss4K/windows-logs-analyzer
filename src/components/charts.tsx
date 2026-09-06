"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const tooltipStyle = {
  background: "oklch(0.205 0 0)",
  border: "1px solid oklch(1 0 0 / 10%)",
  borderRadius: 8,
  fontSize: 12,
}

export function LogonTrendChart({
  data,
}: {
  data: { day: string; success: number; failed: number }[]
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke="oklch(1 0 0 / 8%)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "oklch(0.708 0 0)", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fill: "oklch(0.708 0 0)", fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="success" name="Successful" stroke="oklch(0.78 0.11 195)" fill="oklch(0.78 0.11 195 / 25%)" />
          <Area type="monotone" dataKey="failed" name="Failed" stroke="oklch(0.70 0.19 22)" fill="oklch(0.70 0.19 22 / 20%)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function LogonTypeChart({ data }: { data: { name: string; value: number }[] }) {
  const colors = ["oklch(0.78 0.11 195)", "oklch(0.75 0.12 250)", "oklch(0.78 0.12 80)", "oklch(0.70 0.19 22)", "oklch(0.72 0.14 145)"]
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid stroke="oklch(1 0 0 / 8%)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "oklch(0.708 0 0)", fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fill: "oklch(0.708 0 0)", fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" name="Logons" radius={4}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
