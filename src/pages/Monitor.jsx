import { useState, useEffect, useRef, lazy, Suspense } from 'react';

const FLOW_NAMES = ['session', 'oidc', 'passkey', 'mfa', 'invite'];
const SSE_PATH = '/viz/auth/stream';
const FLOWS_PATH = '/viz/flows';
const MAX_FEED_EVENTS = 200;

// @unlaxer/tramli-viz は npm 公開済 (0.2.0). dynamic import でバンドルに
// 組み込み、接続先は auth-proxy の /viz/ws (Redis → VizDashboard protocol
// bridge, AUTH-VIZ Phase 1)。
const TRAMLI_VIZ_AVAILABLE = true;
const VizDashboardLazy = TRAMLI_VIZ_AVAILABLE
  ? lazy(() => import('@unlaxer/tramli-viz').then(m => ({ default: m.VizDashboard })))
  : null;

function resolveVizWsUrl() {
  if (typeof window === 'undefined') return '';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/viz/ws`;
}

function eventBadgeClass(type) {
  if (!type) return 'bg-gray-700 text-gray-300';
  if (type.includes('LOGIN_SUCCESS')) return 'bg-green-900/60 text-green-300';
  if (type.includes('LOGIN_FAILED')) return 'bg-red-900/60 text-red-300';
  if (type.includes('LOGOUT')) return 'bg-blue-900/60 text-blue-300';
  if (type.includes('MFA')) return 'bg-purple-900/60 text-purple-300';
  if (type.includes('SESSION_EXPIRED')) return 'bg-yellow-900/60 text-yellow-300';
  return 'bg-gray-700 text-gray-300';
}

function formatTs(tsMs) {
  if (!tsMs) return '';
  try {
    const d = new Date(Number(tsMs));
    return d.toTimeString().slice(0, 8);
  } catch {
    return '';
  }
}

// Display one rendered mermaid-like block for a flow. Since we don't have a
// mermaid renderer bundled here, we show the raw mermaid source in a <pre>.
// When tramli-viz becomes available, it replaces this.
function FlowCard({ name, mermaid, liveCount }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white uppercase">{name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded ${liveCount > 0 ? 'bg-green-900/60 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
          {liveCount > 0 ? `${liveCount} events` : 'idle'}
        </span>
      </div>
      {mermaid ? (
        <pre className="text-[10px] text-gray-400 bg-gray-900 p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap leading-tight">
          {mermaid}
        </pre>
      ) : (
        <div className="h-24 flex items-center justify-center border border-dashed border-gray-600 rounded text-gray-500 text-xs">
          Flow definition pending
        </div>
      )}
    </div>
  );
}

function LiveFeed({ events }) {
  if (!events.length) {
    return (
      <div className="text-gray-500 text-sm py-6 text-center border border-dashed border-gray-700 rounded">
        Waiting for auth events…
      </div>
    );
  }
  return (
    <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
      {events.map((e, i) => (
        <div key={e._id || i} className="py-2 flex items-center gap-3 text-sm">
          <span className="text-gray-500 font-mono text-xs w-20 shrink-0">{formatTs(e.ts)}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${eventBadgeClass(e.type)} shrink-0`}>{e.type || 'UNKNOWN'}</span>
          <span className="text-gray-300 truncate">{e.email || e.userId || '(anonymous)'}</span>
          {e.sessionId && (
            <span className="text-gray-500 font-mono text-[10px] ml-auto truncate max-w-[10rem]">{e.sessionId.slice(0, 12)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function MonitorView() {
  const [status, setStatus] = useState('disconnected');
  const [events, setEvents] = useState([]);
  const [flows, setFlows] = useState({}); // { name: { mermaid } }
  const [perFlowCount, setPerFlowCount] = useState({});
  const idRef = useRef(0);

  // Fetch static flow definitions once
  useEffect(() => {
    let cancelled = false;
    fetch(FLOWS_PATH)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`flows ${r.status}`))))
      .then(data => {
        if (cancelled) return;
        const map = {};
        for (const f of (data.flows || [])) map[f.name] = f;
        setFlows(map);
      })
      .catch(() => { /* soft-fail: endpoint may be absent in this env */ });
    return () => { cancelled = true; };
  }, []);

  // Subscribe to SSE
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(SSE_PATH, { withCredentials: true });
    es.onopen = () => setStatus('connected');
    es.onerror = () => setStatus('error');

    const handleEvent = (ev) => {
      let payload;
      try {
        payload = JSON.parse(ev.data);
      } catch {
        return;
      }
      payload._id = ++idRef.current;
      setEvents(prev => {
        const next = [payload, ...prev];
        return next.length > MAX_FEED_EVENTS ? next.slice(0, MAX_FEED_EVENTS) : next;
      });
      // Bump per-flow count by matching event type prefix to flow name
      const type = (payload.type || '').toLowerCase();
      setPerFlowCount(prev => {
        const copy = { ...prev };
        for (const name of FLOW_NAMES) {
          if (type.includes(name) ||
              (name === 'session' && (type.includes('login') || type.includes('logout') || type.includes('session')))) {
            copy[name] = (copy[name] || 0) + 1;
          }
        }
        return copy;
      });
    };

    es.addEventListener('auth-event', handleEvent);
    es.addEventListener('connected', () => setStatus('connected'));

    return () => {
      es.removeEventListener('auth-event', handleEvent);
      es.close();
    };
  }, []);

  const statusDot = status === 'connected' ? 'bg-green-400' : status === 'error' ? 'bg-red-400' : 'bg-gray-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Monitor</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="text-gray-400">{status}</span>
          </div>
          <div className="text-gray-500 text-xs">
            {events.length} event{events.length === 1 ? '' : 's'} received
          </div>
        </div>
      </div>

      {/* Flow cards */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-400 mb-3">Auth Flows</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FLOW_NAMES.map(name => (
            <FlowCard
              key={name}
              name={name}
              mermaid={flows[name]?.mermaid}
              liveCount={perFlowCount[name] || 0}
            />
          ))}
        </div>
      </div>

      {/* Live feed */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Live auth events</h3>
          <button
            type="button"
            onClick={() => { setEvents([]); setPerFlowCount({}); }}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        </div>
        <LiveFeed events={events} />
      </div>

      {/* tramli-viz dashboard — wired to auth-proxy /viz/ws */}
      {TRAMLI_VIZ_AVAILABLE && VizDashboardLazy && (
        <div className="mt-6">
          <Suspense fallback={<div className="text-gray-400">Loading visualization…</div>}>
            <VizDashboardLazy
              wsUrl={resolveVizWsUrl()}
              layout="layered"
              theme="dark"
              showMetrics
              showCarPool
              showReplay
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}

export default function Monitor() {
  return <MonitorView />;
}
