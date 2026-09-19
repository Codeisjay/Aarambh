import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function ConfidenceTimeline({ data = [] }) {
  if (!data.length) {
    return <div className="text-sm text-slate-400">No timeline data yet.</div>;
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
          <Tooltip />
          <Area type="monotone" dataKey="score" stroke="#22d3ee" fill="#0ea5e9" fillOpacity={0.35} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
