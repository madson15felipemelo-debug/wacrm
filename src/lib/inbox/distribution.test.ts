import { describe, expect, it } from 'vitest';
import { pickNextCandidate } from './distribution';

describe('pickNextCandidate', () => {
  it('returns null for an empty candidate list', () => {
    expect(pickNextCandidate([], new Map(), new Map())).toBeNull();
  });

  it('returns the only candidate when list length is 1', () => {
    expect(pickNextCandidate(['agent-1'], new Map(), new Map())).toBe('agent-1');
  });

  it('picks candidate with lower active load', () => {
    const candidates = ['agent-1', 'agent-2', 'agent-3'];
    const loads = new Map([
      ['agent-1', 5],
      ['agent-2', 2], // lowest load
      ['agent-3', 4],
    ]);
    const times = new Map();

    expect(pickNextCandidate(candidates, loads, times)).toBe('agent-2');
  });

  it('breaks ties using least recently assigned timestamp', () => {
    const candidates = ['agent-1', 'agent-2'];
    const loads = new Map([
      ['agent-1', 3],
      ['agent-2', 3],
    ]);
    // agent-1 was assigned 10 minutes ago, agent-2 was assigned 1 minute ago
    const times = new Map([
      ['agent-1', 1000], // older
      ['agent-2', 2000], // newer
    ]);

    expect(pickNextCandidate(candidates, loads, times)).toBe('agent-1');
  });

  it('favors agent with 0 load even if never assigned before', () => {
    const candidates = ['agent-1', 'agent-2'];
    const loads = new Map([
      ['agent-1', 1],
      ['agent-2', 0], // fresh agent
    ]);
    const times = new Map([
      ['agent-1', 5000],
      ['agent-2', 0],
    ]);

    expect(pickNextCandidate(candidates, loads, times)).toBe('agent-2');
  });

  it('breaks tie deterministically by user id if loads and times are equal', () => {
    const candidates = ['agent-b', 'agent-a'];
    const loads = new Map([
      ['agent-a', 2],
      ['agent-b', 2],
    ]);
    const times = new Map([
      ['agent-a', 1000],
      ['agent-b', 1000],
    ]);

    expect(pickNextCandidate(candidates, loads, times)).toBe('agent-a');
  });
});
