import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function TrendChart({ data }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Performance Trend</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data for selected period</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#1a2e4a" name="Impressions" dot={false} strokeWidth={2} />
            <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#4a7c6f" name="Sessions" dot={false} strokeWidth={2} />
            <Line yAxisId="left" type="monotone" dataKey="engagements" stroke="#7cb8d4" name="Engagements" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
            <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#7c4a2a" name="Conversions" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}