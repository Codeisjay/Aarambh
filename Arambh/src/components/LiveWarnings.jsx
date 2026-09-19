export default function LiveWarnings({ warnings = [], feedback = [] }) {
  const items = warnings.length > 0 ? warnings : feedback.map((entry) => entry.text || entry);

  if (!items.length) {
    return <div className="text-sm text-slate-400">No live warnings</div>;
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 5).map((item, index) => (
        <div key={`${item}-${index}`} className="rounded-lg border border-yellow-700 bg-yellow-900/20 px-3 py-2 text-sm text-yellow-300">
          {item}
        </div>
      ))}
    </div>
  );
}
