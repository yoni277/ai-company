// Intentionally empty. The previous after()-based fan-out was replaced by
// lib/directive-queue.ts (durable queue + in-thread drain). See
// app/api/ceo/directives/[id]/run-pending/route.ts.
//
// Kept as a stub so any stale import path errors out at typecheck rather
// than at runtime.
export {};
