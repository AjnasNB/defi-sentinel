/**
 * Agent Controller - manages the agent lifecycle (start/stop/status).
 * Used by: routes/agent.ts, index.ts
 *
 * Controls the main agent loop interval and exposes state.
 */
import { createInitialState, runAgentCycle } from '../agents/sentinel-agent.js';
import { config } from '../config.js';
import type { AgentState, AgentEvent } from '../shared/types.js';

let state: AgentState = createInitialState();
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners: Set<(event: AgentEvent) => void> = new Set();

/** Start the autonomous agent loop */
export function startAgent(): AgentState {
  if (state.isRunning) return state;

  state = {
    ...state,
    isRunning: true,
    startedAt: Date.now(),
  };

  console.log(`[Controller] Agent started. Checking every ${config.agentIntervalMs / 1000}s`);
  emitEvent({ type: 'state_update', data: state, timestamp: Date.now() });

  // Run first cycle immediately
  runCycle();

  // Then run on interval
  intervalId = setInterval(runCycle, config.agentIntervalMs);

  return state;
}

/** Stop the agent loop */
export function stopAgent(): AgentState {
  if (!state.isRunning) return state;

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  state = { ...state, isRunning: false };
  console.log('[Controller] Agent stopped');
  emitEvent({ type: 'state_update', data: state, timestamp: Date.now() });

  return state;
}

/** Get current agent state */
export function getAgentState(): AgentState {
  return state;
}

/** Trigger emergency stop */
export function emergencyStop(): AgentState {
  state = {
    ...state,
    isRunning: false,
    safetyLimits: { ...state.safetyLimits, emergencyStop: true },
  };

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  console.log('[Controller] EMERGENCY STOP activated');
  emitEvent({ type: 'state_update', data: state, timestamp: Date.now() });

  return state;
}

/** Reset emergency stop and daily counters */
export function resetAgent(): AgentState {
  state = {
    ...state,
    safetyLimits: {
      ...state.safetyLimits,
      emergencyStop: false,
      dailySpentUsd: 0,
    },
  };

  emitEvent({ type: 'state_update', data: state, timestamp: Date.now() });
  return state;
}

/** Update safety limits */
export function updateLimits(updates: Partial<AgentState['safetyLimits']>): AgentState {
  state = {
    ...state,
    safetyLimits: { ...state.safetyLimits, ...updates },
  };
  emitEvent({ type: 'state_update', data: state, timestamp: Date.now() });
  return state;
}

/** Subscribe to agent events (for WebSocket) */
export function subscribe(listener: (event: AgentEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Run one decision cycle */
async function runCycle(): Promise<void> {
  try {
    state = await runAgentCycle(state);
    emitEvent({ type: 'state_update', data: state, timestamp: Date.now() });

    // Emit latest action if there is one
    if (state.actions.length > 0) {
      emitEvent({ type: 'action', data: state.actions[0], timestamp: Date.now() });
    }
  } catch (err) {
    console.error('[Controller] Cycle failed:', err);
    emitEvent({
      type: 'error',
      data: { message: err instanceof Error ? err.message : 'Unknown error' },
      timestamp: Date.now(),
    });
  }
}

/** Emit event to all subscribers */
function emitEvent(event: AgentEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Don't let a bad listener break the agent
    }
  }
}
