import 'server-only';
import type {
  CreateEvidenceTokenInput,
  CreateObjectiveInput,
  CreateOutcomeInput,
  CreateTaskInput,
  EvidenceToken,
  Objective,
  ObjectiveHealth,
  ObjectiveOutcome,
  Task,
  UpdateObjectiveInput,
  UpdateOutcomeMeasurementInput,
  UpdateTaskInput,
  ValidationResult,
} from '@ai-company/shared-types';
import {
  validateEvidenceForTask,
  computeObjectiveHealth,
  outcomeProgressFraction,
  VALIDATOR_VERSION,
} from '@ai-company/doos-core';
import { GOVERNANCE_POLICY } from '@active-instance/governance-policy';
import { getPlatform } from './platform';

/**
 * Service glue for DOOS Phase 1A. Every status transition to 'completed'
 * goes through `completeTask` so the deterministic validator runs before
 * the row hits the DB. The DB floor trigger is the second line of defense.
 */

export class GovernanceLimitError extends Error {
  constructor(
    readonly limit: number,
    readonly current: number,
  ) {
    super(`governance: maxActiveObjectives=${limit} reached (current=${current})`);
    this.name = 'GovernanceLimitError';
  }
}

export class TaskCompletionError extends Error {
  constructor(readonly result: ValidationResult) {
    super(`task evidence insufficient: ${result.reasons.join('; ')}`);
    this.name = 'TaskCompletionError';
  }
}

// ---------- Objectives ----------

export async function listObjectives(): Promise<
  Array<Objective & { health: ObjectiveHealth; outcomeCount: number; taskCount: number }>
> {
  const { repos } = getPlatform();
  const objectives = await repos.objectives.list();
  const out = await Promise.all(
    objectives.map(async (obj) => {
      const [outcomes, tasks] = await Promise.all([
        repos.objectiveOutcomes.listByObjective(obj.id),
        repos.tasks.list({ objectiveId: obj.id }),
      ]);
      return {
        ...obj,
        health: computeObjectiveHealth(obj, outcomes, tasks),
        outcomeCount: outcomes.length,
        taskCount: tasks.length,
      };
    }),
  );
  return out;
}

export async function getObjectiveDetail(id: string): Promise<{
  objective: Objective;
  outcomes: Array<ObjectiveOutcome & { progressFraction: number | null }>;
  tasks: Task[];
  health: ObjectiveHealth;
} | null> {
  const { repos } = getPlatform();
  const objective = await repos.objectives.getById(id);
  if (!objective) return null;
  const [outcomes, tasks] = await Promise.all([
    repos.objectiveOutcomes.listByObjective(id),
    repos.tasks.list({ objectiveId: id }),
  ]);
  return {
    objective,
    outcomes: outcomes.map((o) => ({ ...o, progressFraction: outcomeProgressFraction(o) })),
    tasks,
    health: computeObjectiveHealth(objective, outcomes, tasks),
  };
}

export async function createObjective(input: CreateObjectiveInput): Promise<Objective> {
  const { repos } = getPlatform();
  const targetStatus = input.status ?? 'draft';
  if (targetStatus === 'active') {
    const current = await repos.objectives.countByStatus('active');
    if (current >= GOVERNANCE_POLICY.maxActiveObjectives) {
      throw new GovernanceLimitError(GOVERNANCE_POLICY.maxActiveObjectives, current);
    }
  }
  return repos.objectives.create(input);
}

export async function updateObjective(
  id: string,
  input: UpdateObjectiveInput,
): Promise<Objective> {
  const { repos } = getPlatform();
  if (input.status === 'active') {
    const existing = await repos.objectives.getById(id);
    if (existing && existing.status !== 'active') {
      const current = await repos.objectives.countByStatus('active');
      if (current >= GOVERNANCE_POLICY.maxActiveObjectives) {
        throw new GovernanceLimitError(GOVERNANCE_POLICY.maxActiveObjectives, current);
      }
    }
  }
  return repos.objectives.update(id, input);
}

// ---------- Outcomes ----------

export async function createOutcome(input: CreateOutcomeInput): Promise<ObjectiveOutcome> {
  const { repos } = getPlatform();
  const obj = await repos.objectives.getById(input.objectiveId);
  if (!obj) throw new Error(`objective ${input.objectiveId} not found`);
  return repos.objectiveOutcomes.create(input);
}

export async function updateOutcomeMeasurement(
  id: string,
  input: UpdateOutcomeMeasurementInput,
): Promise<ObjectiveOutcome> {
  const { repos } = getPlatform();
  return repos.objectiveOutcomes.updateMeasurement(id, input);
}

// ---------- Tasks + Evidence ----------

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { repos } = getPlatform();
  const obj = await repos.objectives.getById(input.objectiveId);
  if (!obj) throw new Error(`objective ${input.objectiveId} not found`);
  return repos.tasks.create(input);
}

export async function updateTaskMeta(id: string, input: UpdateTaskInput): Promise<Task> {
  const { repos } = getPlatform();
  return repos.tasks.updateMeta(id, input);
}

export async function attachEvidence(
  taskId: string,
  input: CreateEvidenceTokenInput,
): Promise<{ token: EvidenceToken; validation: ValidationResult }> {
  const { repos } = getPlatform();
  const task = await repos.tasks.getById(taskId);
  if (!task) throw new Error(`task ${taskId} not found`);
  const token = await repos.evidenceTokens.create(taskId, input);
  // Run validator against the now-augmented evidence set so the UI can show
  // whether the task is ready to complete.
  const allTokens = await repos.evidenceTokens.listByTask(taskId);
  const validation = validateEvidenceForTask(task, allTokens);
  if (validation.valid) {
    await repos.evidenceTokens.markVerified(token.id, VALIDATOR_VERSION);
  }
  return { token, validation };
}

export async function completeTask(
  taskId: string,
  completedBy: string,
): Promise<{ task: Task; validation: ValidationResult }> {
  const { repos } = getPlatform();
  const task = await repos.tasks.getById(taskId);
  if (!task) throw new Error(`task ${taskId} not found`);
  if (task.status === 'completed') {
    return { task, validation: { valid: true, reasons: [], validatorVersion: VALIDATOR_VERSION } };
  }
  const tokens = await repos.evidenceTokens.listByTask(taskId);
  const validation = validateEvidenceForTask(task, tokens);
  if (!validation.valid) {
    throw new TaskCompletionError(validation);
  }
  const updated = await repos.tasks.setStatus(taskId, 'completed', { completedBy });
  return { task: updated, validation };
}
