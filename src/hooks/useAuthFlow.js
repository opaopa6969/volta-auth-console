import { useEffect, useRef } from 'react';
import { useFlow } from '@unlaxer/tramli-react';
import {
  sessionResumeDefinition,
  ResumeUser,
  ResumeTenants,
} from '../store/authFlowDefinition.js';
import { useAuthStore } from '../store/authStore.js';

/**
 * tramli ベースの認証フロー hook.
 *
 * sessionResumeDefinition を起動し、AUTHENTICATED に到達したら
 * zustand authStore と同期する。NO_SESSION なら未認証として扱う。
 */
export function useAuthFlow() {
  const { state, context, error, isLoading } = useFlow(sessionResumeDefinition);
  const synced = useRef(false);

  const setAuth = useAuthStore(s => s.setAuth);
  const setUnauthenticated = useAuthStore(s => s.setUnauthenticated);

  useEffect(() => {
    if (synced.current || isLoading) return;

    if (state === 'AUTHENTICATED' && context) {
      const user = context.get(ResumeUser);
      const tenants = context.get(ResumeTenants);
      if (user) {
        setAuth(user, tenants || []);
        synced.current = true;
      }
    } else if (state === 'NO_SESSION') {
      setUnauthenticated(error?.message || 'No active session');
      synced.current = true;
    }
  }, [state, context, isLoading, error, setAuth, setUnauthenticated]);

  return { state, error, isLoading };
}
