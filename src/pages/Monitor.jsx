import { useState, useEffect, lazy, Suspense } from 'react';

const FLOWS = ['session', 'oidc', 'passkey', 'mfa', 'invite'];

// @unlaxer/tramli-viz is not yet published (depends on tramli#37).
// When available, install the package and set this to true.
const TRAMLI_VIZ_AVAILABLE = false;

const VizDashboardLazy = TRAMLI_VIZ_AVAILABLE
  ? lazy(() => import('@unlaxer/tramli-viz').then(m => ({ default: m.VizDashboard })))
  : null;

function FlowCard({ name }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white uppercase">{name}</h3>
        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">waiting</span>
      </div>
      <div className="h-32 flex items-center justify-center border border-dashed border-gray-600 rounded text-gray-500 text-xs">
        Visualization pending
      </div>
    </div>
  );
}

function VizView() {
  const [wsStatus, setWsStatus] = useState('disconnected');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/viz/ws`;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsStatus('connected');
      ws.onclose = () => setWsStatus('disconnected');
      ws.onerror = () => setWsStatus('error');
    } catch {
      // WebSocket constructor failed — update status via a microtask
      // to avoid the setState-in-effect lint rule.
      Promise.resolve().then(() => setWsStatus('error'));
    }
    return () => ws?.close();
  }, []);

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Monitor</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-400' : wsStatus === 'error' ? 'bg-red-400' : 'bg-gray-500'}`} />
          <span className="text-gray-400">{wsStatus}</span>
        </div>
      </div>
      <Suspense fallback={<div className="text-gray-400">Loading visualization...</div>}>
        <VizDashboardLazy
          wsUrl={`${protocol}//${window.location.host}/viz/ws`}
          flows={FLOWS}
          layout="layered"
          theme="dark"
          showMetrics
          showLiveFeed
        />
      </Suspense>
    </div>
  );
}

function PreviewView() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Monitor</h2>
        <span className="text-xs px-2 py-1 rounded bg-yellow-900/40 text-yellow-400">
          Preview — dependencies pending
        </span>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">Dependencies</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-yellow-400">&#9679;</span>
            <span className="text-gray-300">@unlaxer/tramli-viz</span>
            <span className="text-gray-500">— awaiting tramli#37 (npm publish)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-yellow-400">&#9679;</span>
            <span className="text-gray-300">volta-auth-proxy /viz/ws</span>
            <span className="text-gray-500">— awaiting auth-proxy#22 (Redis bridge + WS endpoint)</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-400 mb-3">Auth Flows (preview layout)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FLOWS.map(f => <FlowCard key={f} name={f} />)}
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
        <h3 className="text-sm font-bold text-white mb-2">Expected features</h3>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>Real-time state machine visualization per flow</li>
          <li>Active session count + transitions/sec metrics</li>
          <li>Live feed of auth events (login, MFA, errors)</li>
          <li>Layered graph layout with dark theme</li>
        </ul>
      </div>
    </div>
  );
}

export default function Monitor() {
  return TRAMLI_VIZ_AVAILABLE ? <VizView /> : <PreviewView />;
}
