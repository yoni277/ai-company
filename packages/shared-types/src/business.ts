// P015A (2026-06-06): instance-specific business metric types were removed from
// the generic shared-types package and now live with their owning connector in
// the connector layer. The platform's shared types must stay business-agnostic.
// This file is intentionally empty and is no longer re-exported from the package
// index; it remains only because the agent sandbox blocks deletion (pending git rm).
export {};
