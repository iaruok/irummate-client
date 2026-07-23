import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthOperationCoordinator } from './authOperationCoordinator.js';

function createDeferred() {
  let reject;
  let resolve;

  const promise = new Promise((resolvePromise, rejectPromise) => {
    reject = rejectPromise;
    resolve = resolvePromise;
  });

  return { promise, reject, resolve };
}

function createHarness(loadCurrentUser) {
  const commits = [];
  const tokenChanges = [];

  const coordinator = createAuthOperationCoordinator({
    commitAuthenticated(user) {
      commits.push({ state: 'authenticated', user });
    },
    commitTokenRefreshed() {
      commits.push({ state: 'token-refreshed' });
    },
    commitUnauthenticated() {
      commits.push({ state: 'unauthenticated' });
    },
    loadCurrentUser,
    removeAccessToken() {
      tokenChanges.push({ type: 'remove' });
    },
    setAccessToken(accessToken) {
      tokenChanges.push({ accessToken, type: 'set' });
    },
  });

  return { commits, coordinator, tokenChanges };
}

test('stale bootstrap completion and events cannot commit over a newer login', async () => {
  const bootstrapUser = createDeferred();
  const loginUser = createDeferred();
  let loadCount = 0;
  const authenticatedUser = { id: 'new-user', role: 'USER' };
  const staleUser = { id: 'stale-user', role: 'GUEST' };
  const harness = createHarness(() => {
    loadCount += 1;
    return loadCount === 1 ? bootstrapUser.promise : loginUser.promise;
  });

  const bootstrapPromise = harness.coordinator.bootstrap();
  const loginPromise = harness.coordinator.completeLogin('new-access-token');

  harness.coordinator.handleAuthExpired();
  harness.coordinator.handleTokenRefreshed();
  bootstrapUser.resolve(staleUser);
  await bootstrapPromise;

  assert.deepEqual(harness.commits, []);

  loginUser.resolve(authenticatedUser);

  assert.equal(await loginPromise, authenticatedUser);
  assert.deepEqual(harness.commits, [
    { state: 'authenticated', user: authenticatedUser },
  ]);
});

test('login waits for an in-flight bootstrap before installing and validating its token', async () => {
  const bootstrapUser = createDeferred();
  const loginUser = createDeferred();
  const order = [];
  let loadCount = 0;
  const bootstrapError = new Error('stale bootstrap failed');
  const authenticatedUser = { id: 'new-user', role: 'USER' };

  const coordinator = createAuthOperationCoordinator({
    commitAuthenticated() {
      order.push('commit-authenticated');
    },
    commitTokenRefreshed() {
      order.push('commit-token-refreshed');
    },
    commitUnauthenticated() {
      order.push('commit-unauthenticated');
    },
    loadCurrentUser() {
      loadCount += 1;
      order.push(loadCount === 1 ? 'load-bootstrap' : 'load-login');
      return loadCount === 1 ? bootstrapUser.promise : loginUser.promise;
    },
    removeAccessToken() {
      order.push('remove-token');
    },
    setAccessToken() {
      order.push('set-token');
    },
  });

  const bootstrapPromise = coordinator.bootstrap();
  const loginPromise = coordinator.completeLogin('new-access-token');

  await Promise.resolve();
  assert.deepEqual(order, ['load-bootstrap']);

  bootstrapUser.reject(bootstrapError);
  await assert.rejects(bootstrapPromise, bootstrapError);
  await Promise.resolve();

  assert.deepEqual(order, [
    'load-bootstrap',
    'set-token',
    'load-login',
  ]);

  loginUser.resolve(authenticatedUser);
  assert.equal(await loginPromise, authenticatedUser);
});

test('failed user validation removes the new token, clears auth state, and rejects', async () => {
  const harness = createHarness(async () => null);

  await assert.rejects(
    harness.coordinator.completeLogin('invalid-access-token'),
    /current user/i,
  );

  assert.deepEqual(harness.tokenChanges, [
    { accessToken: 'invalid-access-token', type: 'set' },
    { type: 'remove' },
  ]);
  assert.deepEqual(harness.commits, [{ state: 'unauthenticated' }]);
});

test('validation errors are rethrown after login rollback', async () => {
  const validationError = new Error('status request failed');
  const harness = createHarness(async () => {
    throw validationError;
  });

  await assert.rejects(
    harness.coordinator.completeLogin('new-access-token'),
    validationError,
  );

  assert.deepEqual(harness.tokenChanges, [
    { accessToken: 'new-access-token', type: 'set' },
    { type: 'remove' },
  ]);
  assert.deepEqual(harness.commits, [{ state: 'unauthenticated' }]);
});

test('bootstrap cannot start after login completion has begun', async () => {
  const loginUser = createDeferred();
  let loadCount = 0;
  const authenticatedUser = { id: 'new-user', role: 'USER' };
  const harness = createHarness(() => {
    loadCount += 1;
    return loginUser.promise;
  });

  const loginPromise = harness.coordinator.completeLogin('new-access-token');
  const bootstrapResult = await harness.coordinator.bootstrap();

  assert.equal(bootstrapResult, null);
  assert.equal(loadCount, 1);

  loginUser.resolve(authenticatedUser);
  assert.equal(await loginPromise, authenticatedUser);
  assert.equal(loadCount, 1);
});
