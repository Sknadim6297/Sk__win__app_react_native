/**
 * In-memory guest entry after logout vs cold start.
 * Cold start (not logged in) → Landing / welcome.
 * Logout (or cleared prior session) → Auth / login.
 */

let guestEntryRoute = 'Landing';

export function getGuestEntryRoute() {
  return guestEntryRoute;
}

/** Call when the user leaves an authenticated session (logout / invalid token). */
export function markPreferLoginAfterLogout() {
  guestEntryRoute = 'Auth';
}

/** Reset for a fresh app process / first open. */
export function resetGuestEntryToWelcome() {
  guestEntryRoute = 'Landing';
}
