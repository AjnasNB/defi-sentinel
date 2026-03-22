/**
 * API client for the DeFi Sentinel backend.
 * Used by: all components.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getHealth: () => fetchApi<any>('/api/health'),
  getAgentState: () => fetchApi<any>('/api/agent/state'),
  startAgent: () => fetchApi<any>('/api/agent/start', { method: 'POST' }),
  stopAgent: () => fetchApi<any>('/api/agent/stop', { method: 'POST' }),
  emergencyStop: () => fetchApi<any>('/api/agent/emergency-stop', { method: 'POST' }),
  resetAgent: () => fetchApi<any>('/api/agent/reset', { method: 'POST' }),
  getRates: () => fetchApi<any>('/api/agent/rates'),
  getOpportunities: () => fetchApi<any>('/api/agent/opportunities'),
  getWallet: (chain?: string) => fetchApi<any>(`/api/wallet${chain ? `?chain=${chain}` : ''}`),
};

/** Create WebSocket connection for real-time updates */
export function createWsConnection(onMessage: (event: any) => void): WebSocket | null {
  const wsUrl = API_BASE.replace('http', 'ws') + '/ws';
  try {
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch {}
    };
    ws.onerror = () => console.log('WebSocket error - will retry');
    return ws;
  } catch {
    return null;
  }
}
