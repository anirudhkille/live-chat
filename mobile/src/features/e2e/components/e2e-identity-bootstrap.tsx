import { useE2EIdentity } from "../hooks/use-e2e-identity";

/**
 * Mounted once under the query provider. Runs identity loading/provisioning
 * after authentication without blocking navigation or chat rendering.
 */
export function E2EIdentityBootstrap() {
  useE2EIdentity();
  return null;
}
