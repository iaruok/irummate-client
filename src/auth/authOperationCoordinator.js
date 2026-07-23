export function createAuthOperationCoordinator({
  commitAuthenticated,
  commitTokenRefreshed,
  commitUnauthenticated,
  loadCurrentUser,
  removeAccessToken,
  setAccessToken,
}) {
  let bootstrapPromise = null;
  let hasLoginStarted = false;
  let isLoginInProgress = false;
  let operationVersion = 0;

  function isCurrentBootstrap(version) {
    return version === operationVersion && !hasLoginStarted;
  }

  function bootstrap() {
    if (hasLoginStarted) {
      return Promise.resolve(null);
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    const version = ++operationVersion;
    const operationPromise = (async () => {
      try {
        const user = await loadCurrentUser();

        if (isCurrentBootstrap(version)) {
          commitAuthenticated(user);
        }

        return user;
      } catch (error) {
        if (isCurrentBootstrap(version)) {
          commitUnauthenticated();
        }

        throw error;
      }
    })();

    bootstrapPromise = operationPromise;

    const clearBootstrap = () => {
      if (bootstrapPromise === operationPromise) {
        bootstrapPromise = null;
      }
    };

    operationPromise.then(clearBootstrap, clearBootstrap);

    return operationPromise;
  }

  async function completeLogin(accessToken) {
    hasLoginStarted = true;
    isLoginInProgress = true;
    operationVersion += 1;

    const pendingBootstrap = bootstrapPromise;

    try {
      if (pendingBootstrap) {
        try {
          await pendingBootstrap;
        } catch {
          // The bootstrap result is stale; only its completion is required.
        }
      }

      setAccessToken(accessToken);

      const user = await loadCurrentUser();

      if (user === null || user === undefined) {
        throw new Error('OAuth login did not return a current user.');
      }

      commitAuthenticated(user);

      return user;
    } catch (error) {
      removeAccessToken();
      commitUnauthenticated();

      throw error;
    } finally {
      isLoginInProgress = false;
    }
  }

  function handleAuthExpired() {
    if (isLoginInProgress) {
      return;
    }

    operationVersion += 1;
    commitUnauthenticated();
  }

  function handleTokenRefreshed() {
    if (isLoginInProgress) {
      return;
    }

    commitTokenRefreshed();
  }

  return {
    bootstrap,
    completeLogin,
    handleAuthExpired,
    handleTokenRefreshed,
  };
}
