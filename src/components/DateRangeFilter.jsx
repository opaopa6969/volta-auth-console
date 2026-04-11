const quickRanges = [
  { label: '1h', hours: 1 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 24 * 7 },
  { label: '30d', hours: 24 * 30 },
];

function toLocalDatetime(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DateRangeFilter({ from, to, onChange }) {
  const handleQuick = (hours) => {
    const now = new Date();
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
    onChange({ from: start.toISOString(), to: now.toISOString() });
  };

  const handleFrom = (e) => {
    const val = e.target.value;
    onChange({ from: val ? new Date(val).toISOString() : null, to });
  };

  const handleTo = (e) => {
    const val = e.target.value;
    onChange({ from, to: val ? new Date(val).toISOString() : null });
  };

  const handleClear = () => onChange({ from: null, to: null });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        {quickRanges.map(r => (
          <button key={r.label} onClick={() => handleQuick(r.hours)}
            className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white">
            {r.label}
          </button>
        ))}
      </div>
      <input type="datetime-local" value={toLocalDatetime(from)} onChange={handleFrom}
        className="px-2 py-1 text-xs border border-gray-700 rounded bg-gray-800 text-gray-200 focus:outline-none focus:border-blue-500" />
      <span className="text-gray-500 text-xs">to</span>
      <input type="datetime-local" value={toLocalDatetime(to)} onChange={handleTo}
        className="px-2 py-1 text-xs border border-gray-700 rounded bg-gray-800 text-gray-200 focus:outline-none focus:border-blue-500" />
      {(from || to) && (
        <button onClick={handleClear} className="text-xs text-gray-500 hover:text-white">Clear</button>
      )}
    </div>
  );
}
