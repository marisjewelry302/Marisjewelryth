"use client";

import { useCallback, useEffect, useState } from "react";

let sessionSnapshot = {
  customer: null,
  isLoggedIn: false,
  isLoading: true,
  error: null
};
let sessionPromise = null;
const listeners = new Set();

function emitSession(nextSnapshot) {
  sessionSnapshot = {
    ...sessionSnapshot,
    ...nextSnapshot
  };

  for (const listener of listeners) {
    listener(sessionSnapshot);
  }
}

async function loadCustomerSession({ force = false } = {}) {
  if (!force && !sessionSnapshot.isLoading) {
    return sessionSnapshot;
  }

  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = fetch("/api/account/me", {
    cache: "no-store",
    credentials: "same-origin"
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Customer session could not be loaded.");
      }

      const payload = await response.json();
      const customer = payload?.customer || null;
      const nextSnapshot = {
        customer,
        isLoggedIn: Boolean(customer),
        isLoading: false,
        error: null
      };

      emitSession(nextSnapshot);
      return sessionSnapshot;
    })
    .catch((error) => {
      const nextSnapshot = {
        customer: null,
        isLoggedIn: false,
        isLoading: false,
        error
      };

      emitSession(nextSnapshot);
      return sessionSnapshot;
    })
    .finally(() => {
      sessionPromise = null;
    });

  return sessionPromise;
}

export function refreshCustomerSession() {
  emitSession({ isLoading: true });
  return loadCustomerSession({ force: true });
}

export function useCustomerSession() {
  const [snapshot, setSnapshot] = useState(sessionSnapshot);

  useEffect(() => {
    listeners.add(setSnapshot);
    loadCustomerSession({ force: true });

    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);

  const refresh = useCallback(() => refreshCustomerSession(), []);

  return {
    ...snapshot,
    refresh
  };
}
