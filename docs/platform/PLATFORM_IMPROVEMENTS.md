# PLATFORM_IMPROVEMENTS

This document contains platform-level feature candidates that passed architectural review but are awaiting operational validation.

## Status values

- Candidate — idea accepted architecturally, awaiting production evidence
- Validated — proven by production usage
- Approved — scheduled for implementation
- Implemented — completed

## Candidate template

Every candidate must answer:

- Status
- Priority
- Owner
- Last reviewed (YYYY-MM-DD)
- Epic (if part of one)
- Origin
- Problem
- Proposed Capability
- Cloneability Impact — must be fully generic; any instance-specific element disqualifies the candidate from the platform layer
- Governance Rule — short restatement; master source is PLATFORM_DECISIONS.md
- Constraints
- Required Metadata
- Approval Required For
- Non-Goals
- Validation Anchor
- Evidence Required

Roadmap phases are tracked at the epic level, not per candidate.

---

## AI-ORG-EPIC-001 — Dynamic Organization Management

Roadmap:

Phase 1 — Fixed VP Structure
Phase 2 — Generic Organizational Hierarchy
Phase 3 — VP Organizational Design
Phase 4 — Dynamic Agent Creation
Phase 5 — Shared Capability Marketplace
Phase 6 — Self-Optimizing Organizational Structures

Candidates contributing to this epic:

- AI-ORG-001 — Dynamic Organization Expansion (Phases 3–4)
- Phase 5 and Phase 6 candidates to be added when AI-ORG-001 reaches Validated status and production evidence justifies them.

---

## AI-ORG-001 — Dynamic Organization Expansion

Status: Candidate

Priority: Future

Owner: Yoni

Last reviewed: 2026-06-04

Epic: AI-ORG-EPIC-001 — Dynamic Organization Management

Origin:
AI Company organizational scalability discussions.

Problem:
As responsibilities expand, a VP may need to organize work into specialized functions and delegate execution to subordinate AI workers. Designing the structure and instantiating agents to fill it are inseparable: a position with no agent is inert, and an agent with no defined position bypasses governance.

Proposed Capability:
Allow a VP to (a) propose an organizational structure beneath their position and (b) request creation of subordinate AI agents to fill those positions.

Sub-capabilities:

- Organizational Design — VP defines roles, reporting lines, and depth.
- Agent Creation — Platform instantiates an agent for an approved position.
- Depth control — Maximum hierarchy depth below VP is 0–2 levels.
- Governance workflow — Human approval gates every change.
- Budget controls — Per-role spending limits.
- Audit trail — All proposals, approvals, and instantiations recorded.

Examples:

Example A — flat:

VP Engineering
└── Test Manager

Example B — one level, multiple specialists:

VP Marketing
├── Market Analyst
├── SEO Specialist
└── Content Researcher

Example C — two levels:

VP Finance
└── Controller
    ├── AP Analyst
    └── Reporting Analyst

Cloneability Impact:
Fully generic. The capability is organizationally generic and not tied to any specific business domain. Applicable to any AI company instance.

Governance Rule:
AI proposes. Human approves. Platform executes. Self-replication without approval is prohibited. Master source: PLATFORM_DECISIONS.md.

Constraints:

- Depth below VP: 0–2 levels.
- VP chooses the structure within depth limits.
- Platform validates hierarchy limits.
- Human approval required for all organizational changes.
- No agent instantiation without an approved position.
- No position without a defined role specification.

Required Metadata:

- position_title
- parent_position
- responsibilities
- capabilities
- tool_permissions
- budget_limit
- performance_metrics

Approval Required For:

- Create role
- Delete role
- Merge role
- Split role
- Reassign reporting structure
- Increase hierarchy depth
- Instantiate agent for a position
- Decommission agent

Potential Workflow:

1. VP identifies capability gap or recurring workstream.
2. VP generates Org Change Intent (role + agent).
3. Human receives approval request.
4. Human approves or rejects.
5. Platform creates position and instantiates agent.
6. Agent becomes available for delegation.

Non-Goals:

- Unlimited hierarchy growth.
- Autonomous self-replication.
- Code generation.
- Bypass of governance workflows.

Validation Anchor:
Not yet validated in production.

Evidence Required:

- Demonstrated VP workload saturation.
- Multiple recurring workstreams under a single VP.
- Repeated delegation patterns.
- Context window constraints on the VP.
- Quality degradation from responsibility concentration.
- Need for specialization exceeding flat-team effectiveness.
