// P015A (2026-06-06): instance-specific owner-acquisition data loading was
// removed from the generic dashboard. This module is orphaned (no importers)
// and pending `git rm`; it is left empty because the agent sandbox filesystem
// blocks file deletion. Re-introduce instance metrics via an instance-declared
// overview extension, not from platform code.
export {};
