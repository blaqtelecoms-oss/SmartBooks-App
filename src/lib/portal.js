/**
 * Portal helpers.
 *
 * A user belongs to one portal: "business" or "accountant". The portal is stored
 * on the account (profiles.portal, mirrored in the auth user's metadata at signup)
 * so a returning user always lands back in the portal they joined.
 *
 * localStorage only remembers the last portal used on this device; it is a
 * fallback for accounts created before portals were recorded.
 */
export const PORTAL_STORAGE_KEY = "smartbooks_portal";

export const isPortal = (value) => value === "business" || value === "accountant";

export const readStoredPortal = () => {
  try {
    const saved = localStorage.getItem(PORTAL_STORAGE_KEY);
    return isPortal(saved) ? saved : null;
  } catch (e) {
    return null;
  }
};

export const storePortal = (portal) => {
  if (!isPortal(portal)) return;
  try {
    localStorage.setItem(PORTAL_STORAGE_KEY, portal);
  } catch (e) {
    /* storage unavailable — the account's own portal still applies */
  }
};

/** The portal recorded on the account, or null for legacy accounts. */
export const accountPortal = (user) => (isPortal(user?.portal) ? user.portal : null);

/** Portal used for navigation and copy: the account's portal, then this device's. */
export const resolvePortal = (user) => accountPortal(user) || readStoredPortal() || "accountant";
