// src/pages/AdminReports.jsx
import { useEffect, useState, useMemo } from 'react'
import { api }               from '../lib/api'      // ← add this

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts'

// Last-12-months helper
function getLast12Months() {
  const months = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key   = d.toISOString().slice(0, 7)  // "YYYY-MM"
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    months.push({ key, label })
  }
  return months
}

// A distinct color palette for Pie slices
const PIE_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#6366F1']

export default function AdminReports() {
  const [rawData, setRawData] = useState([])

  // 1. Fetch raw submissions once
  useEffect(() => {
    api
      .get('/submissions')
      .then((res) => setRawData(res.data))
      .catch((err) => console.error(err))
  }, [])

  // 2. Compute actual dues per record: dues% × salary
  const withContributions = useMemo(() => {
    return rawData.map((r) => {
      const pct = parseFloat(r.dues)   // e.g. "1" for 1%
      const sal = parseFloat(r.salary) // your base salary field
      const validPct = isNaN(pct) ? 0 : pct / 100
      const validSal = isNaN(sal) ? 0 : sal
      return {
        ...r,
        contribution: validPct * validSal,
      }
    })
  }, [rawData])

  // 3. Total contributions over last 12 months
  const totalContrib12m = useMemo(() => {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - 12)
    return withContributions
      .filter((r) => {
        const d = new Date(r.createdAt)
        return !isNaN(d) && d >= cutoff
      })
      .reduce((sum, r) => sum + r.contribution, 0)
  }, [withContributions])

  // 4. Build 12-month time-series
  const timeseries = useMemo(() => {
    const months = getLast12Months()
    const map = Object.fromEntries(months.map((m) => [m.key, 0]))
    withContributions.forEach((r) => {
      const d = new Date(r.createdAt)
      if (isNaN(d)) return
      const key = d.toISOString().slice(0, 7)
      if (map[key] !== undefined) map[key] += r.contribution
    })
    return months.map((m) => ({
      name: m.label,
      contribution: map[m.key],
    }))
  }, [withContributions])

  // 5. Top 5 employers + Others by total contributions
  const topEmployers = useMemo(() => {
    const sums = withContributions.reduce((acc, r) => {
      const key = r.employerName || 'Unknown'
      acc[key] = (acc[key] || 0) + r.contribution
      return acc
    }, {})
    const arr = Object.entries(sums)
      .map(([name, contribution]) => ({ name, contribution }))
      .sort((a, b) => b.contribution - a.contribution)
    const top5 = arr.slice(0, 5)
    const otherSum = arr.slice(5).reduce((sum, x) => sum + x.contribution, 0)
    if (otherSum > 0) top5.push({ name: 'Others', contribution: otherSum })
    return top5
  }, [withContributions])

  // 6. Pie‐chart data = same topEmployers
  const pieData = topEmployers.map((e, i) => ({
    ...e,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))

  // 7. Drill-down stub
  const onBarClick = (payload) => {
    if (!payload) return
    const { name, contribution } = payload
    alert(`Drill-down for ${name}\nTotal collected: ₦${contribution.toLocaleString()}`)
  }

  return (
    <div className="p-6 space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Total Collected (12m)</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-700">
            Tsh{totalContrib12m.toLocaleString()}
          </p>
        </div>
        {/* Avg */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Avg Monthly</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-700">
            Tsh{Math.round(totalContrib12m / 12).toLocaleString()}
          </p>
        </div>
        {/* Records */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Records Processed</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-700">
            {rawData.length}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Time-Series Line */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">
            12-Month Contribution Trend
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeseries} margin={{ right: 30 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => v.toLocaleString()}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(val) => `Tsh${Number(val).toLocaleString()}`}
              />
              <Line
                type="monotone"
                dataKey="contribution"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal Bar + Pie Combo */}
        <div className="space-y-6">
          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-700">
              Top Employers (12m)
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={topEmployers}
                layout="vertical"
                margin={{ left: 100, right: 30 }}
                onClick={({ activePayload }) =>
                  onBarClick(activePayload?.[0]?.payload)
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => v.toLocaleString()}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  style={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(val) =>
                    `Tsh${Number(val).toLocaleString()}`
                  }
                />
                <Bar dataKey="contribution" fill="#10B981" >
                  <LabelList
                    dataKey="contribution"
                    position="right"
                    formatter={(v) => `Tsh${Number(v).toLocaleString()}`}
                    style={{ fill: '#374151', fontSize: 12 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-700">
              Employer Share
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="contribution"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ name, contribution }) =>
                    `${name}: ${((contribution / totalContrib12m) * 100).toFixed(1)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) =>
                    `Tsh${Number(val).toLocaleString()}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
