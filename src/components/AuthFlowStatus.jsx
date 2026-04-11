const stateLabels = {
  CHECKING: 'Checking session...',
  AUTHENTICATED: 'Authenticated',
  NO_SESSION: 'No session',
  // Full OIDC flow states
  UNAUTHENTICATED: 'Not authenticated',
  LOGIN_REDIRECT: 'Redirecting to IdP...',
  LOGIN_PENDING: 'Waiting for login...',
  CALLBACK_RECEIVED: 'Processing callback...',
  USER_RESOLVED: 'User verified',
  MFA_PENDING: 'MFA required',
  SESSION_CREATED: 'Session created',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
  EXPIRED: 'Session expired',
};

const stateColors = {
  CHECKING: 'text-yellow-400',
  AUTHENTICATED: 'text-green-400',
  NO_SESSION: 'text-gray-400',
  UNAUTHENTICATED: 'text-gray-400',
  LOGIN_REDIRECT: 'text-blue-400',
  LOGIN_PENDING: 'text-blue-400',
  CALLBACK_RECEIVED: 'text-blue-400',
  USER_RESOLVED: 'text-green-400',
  MFA_PENDING: 'text-yellow-400',
  SESSION_CREATED: 'text-green-400',
  COMPLETE: 'text-green-400',
  FAILED: 'text-red-400',
  EXPIRED: 'text-red-400',
};

export default function AuthFlowStatus({ state, error }) {
  if (!state) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Auth Flow:</span>
      <span className={`font-mono font-bold ${stateColors[state] || 'text-gray-300'}`}>
        {stateLabels[state] || state}
      </span>
      {error && (
        <span className="text-red-400 text-xs">({error.message})</span>
      )}
    </div>
  );
}
