import { redirect } from 'next/navigation';

/**
 * Default landing — mitigation for P055.
 *
 * Soft navigation ORIGINATING from the Command Center (`/ceo`) currently locks
 * the renderer's main thread (a CPU freeze, not an error — see P055 / the
 * architect ruling). Until that is profiled and fixed, the app must not land
 * the operator on `/ceo`. The root now sends them to `/projects`, which is
 * lightweight and navigates correctly. `/ceo` and `/overview` remain directly
 * reachable. Revert this once P055B lands and `/ceo` is safe as a landing.
 */
export default function RootLanding() {
  redirect('/projects');
}
