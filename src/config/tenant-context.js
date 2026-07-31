import { AsyncLocalStorage } from "node:async_hooks";

// Keeps the authenticated account attached to the current HTTP request without
// passing it through every service and repository call.
export const tenantContext = new AsyncLocalStorage();

export const currentOwnerId = () => tenantContext.getStore()?.ownerId;
