const { acquireLock, releaseLock, isLocked } = require('../../src/services/distributedLock');

describe('distributedLock Service', () => {
  const testKey = 'test:session_123:0';

  afterEach(async () => {
    // Release any lingering locks for cleanup
    await releaseLock(testKey, 'cleanup');
  });

  test('successfully acquires a lock and returns a unique lockId', async () => {
    const { acquired, lockId } = await acquireLock(testKey, 5000);
    expect(acquired).toBe(true);
    expect(typeof lockId).toBe('string');
    expect(lockId.length).toBeGreaterThan(10);

    const locked = await isLocked(testKey);
    expect(locked).toBe(true);

    const released = await releaseLock(testKey, lockId);
    expect(released).toBe(true);

    const stillLocked = await isLocked(testKey);
    expect(stillLocked).toBe(false);
  });

  test('prevents concurrent acquisition for the same key by a second instance', async () => {
    const first = await acquireLock(testKey, 10000);
    expect(first.acquired).toBe(true);

    const second = await acquireLock(testKey, 10000);
    expect(second.acquired).toBe(false);
    expect(second.lockId).toBeNull();

    // Release first lock
    await releaseLock(testKey, first.lockId);

    // Now second should be able to acquire
    const third = await acquireLock(testKey, 10000);
    expect(third.acquired).toBe(true);

    await releaseLock(testKey, third.lockId);
  });

  test('cannot release lock with mismatched lockId', async () => {
    const { acquired, lockId } = await acquireLock(testKey, 10000);
    expect(acquired).toBe(true);

    const releasedWrong = await releaseLock(testKey, 'wrong-lock-id');
    expect(releasedWrong).toBe(false);

    // Lock must still be held
    const locked = await isLocked(testKey);
    expect(locked).toBe(true);

    await releaseLock(testKey, lockId);
  });

  test('auto-expires after lease duration', async () => {
    // Acquire with short 100ms lease
    const first = await acquireLock(testKey, 100);
    expect(first.acquired).toBe(true);

    // Wait 150ms for lease to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Next acquire should succeed because previous lease expired
    const second = await acquireLock(testKey, 5000);
    expect(second.acquired).toBe(true);

    await releaseLock(testKey, second.lockId);
  });
});
