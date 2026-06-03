import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { envFromProcessEnv } from '@ai-company/database';
import type {
  CEODecision,
  CEODecisionStatus,
  CEODirective,
  CreateCEODecisionInput,
  CreateCEODirectiveInput,
  UpdateCEODecisionInput,
} from '@ai-company/shared-types';

type DirectiveRow = {
  id: string;
  created_at: string;
  title: string;
  directive: string;
  category: string;
  priority: string;
  active: boolean;
  expires_at: string | null;
  is_override: boolean;
  target_project_id: string | null;
};

type DecisionRow = {
  id: string;
  created_at: string;
  source_action_id: string | null;
  project_id: string | null;
  decision_title: string;
  decision_description: string | null;
  decision_status: CEODecisionStatus;
  owner: string | null;
  due_date: string | null;
  priority: string;
  notes: string | null;
};

function mapDirective(row: DirectiveRow): CEODirective {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    directive: row.directive,
    category: row.category,
    priority: row.priority,
    active: row.active,
    expiresAt: row.expires_at,
    isOverride: row.is_override,
    targetProjectId: row.target_project_id,
  };
}

function mapDecision(row: DecisionRow): CEODecision {
  return {
    id: row.id,
    createdAt: row.created_at,
    sourceActionId: row.source_action_id,
    projectId: row.project_id,
    decisionTitle: row.decision_title,
    decisionDescription: row.decision_description,
    decisionStatus: row.decision_status,
    owner: row.owner,
    dueDate: row.due_date,
    priority: row.priority,
    notes: row.notes,
  };
}

function getClient(): SupabaseClient | null {
  const env = envFromProcessEnv();
  if (env.dataMode !== 'supabase' || !env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return null;
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
    db: { schema: env.supabaseSchema ?? 'ai_company' },
  }) as SupabaseClient;
}

/** In-memory fallback when not in supabase mode (dev only; not durable). */
const memoryDirectives: CEODirective[] = [];
const memoryDecisions: CEODecision[] = [];

export async function listActiveDirectives(): Promise<CEODirective[]> {
  const client = getClient();
  if (!client) {
    const now = Date.now();
    return memoryDirectives.filter(
      (d) =>
        d.active &&
        (!d.expiresAt || new Date(d.expiresAt).getTime() > now),
    );
  }
  const { data, error } = await client
    .from('ceo_directives')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const now = new Date().toISOString();
  return (data as DirectiveRow[])
    .filter((d) => !d.expires_at || d.expires_at > now)
    .map(mapDirective);
}

export async function createDirective(input: CreateCEODirectiveInput): Promise<CEODirective> {
  const row = {
    title: input.title,
    directive: input.directive,
    category: input.category,
    priority: input.priority,
    active: input.active ?? true,
    expires_at: input.expiresAt ?? null,
    is_override: input.isOverride ?? false,
    target_project_id: input.targetProjectId ?? null,
  };
  const client = getClient();
  if (!client) {
    const d: CEODirective = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      title: row.title,
      directive: row.directive,
      category: row.category,
      priority: row.priority,
      active: row.active,
      expiresAt: row.expires_at,
      isOverride: row.is_override,
      targetProjectId: row.target_project_id,
    };
    memoryDirectives.unshift(d);
    return d;
  }
  const { data, error } = await client.from('ceo_directives').insert(row).select().single();
  if (error) throw new Error(error.message);
  return mapDirective(data as DirectiveRow);
}

export async function listDecisions(): Promise<CEODecision[]> {
  const client = getClient();
  if (!client) {
    return [...memoryDecisions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  const { data, error } = await client
    .from('ceo_decisions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DecisionRow[]).map(mapDecision);
}

export async function createDecision(input: CreateCEODecisionInput): Promise<CEODecision> {
  const row = {
    source_action_id: input.sourceActionId ?? null,
    project_id: input.projectId ?? null,
    decision_title: input.decisionTitle,
    decision_description: input.decisionDescription ?? null,
    decision_status: input.decisionStatus ?? 'proposed',
    owner: input.owner ?? null,
    due_date: input.dueDate ?? null,
    priority: input.priority ?? 'P2',
    notes: input.notes ?? null,
  };
  const client = getClient();
  if (!client) {
    const d: CEODecision = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      sourceActionId: row.source_action_id,
      projectId: row.project_id,
      decisionTitle: row.decision_title,
      decisionDescription: row.decision_description,
      decisionStatus: row.decision_status,
      owner: row.owner,
      dueDate: row.due_date,
      priority: row.priority,
      notes: row.notes,
    };
    memoryDecisions.unshift(d);
    return d;
  }
  const { data, error } = await client.from('ceo_decisions').insert(row).select().single();
  if (error) throw new Error(error.message);
  return mapDecision(data as DecisionRow);
}

export async function updateDecision(
  id: string,
  input: UpdateCEODecisionInput,
): Promise<CEODecision> {
  const patch: Record<string, unknown> = {};
  if (input.decisionStatus !== undefined) patch.decision_status = input.decisionStatus;
  if (input.owner !== undefined) patch.owner = input.owner;
  if (input.dueDate !== undefined) patch.due_date = input.dueDate;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.priority !== undefined) patch.priority = input.priority;

  const client = getClient();
  if (!client) {
    const idx = memoryDecisions.findIndex((d) => d.id === id);
    if (idx < 0) throw new Error('Decision not found');
    const cur = memoryDecisions[idx]!;
    const next: CEODecision = {
      ...cur,
      ...(input.decisionStatus !== undefined ? { decisionStatus: input.decisionStatus } : {}),
      ...(input.owner !== undefined ? { owner: input.owner } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
    };
    memoryDecisions[idx] = next;
    return next;
  }
  const { data, error } = await client
    .from('ceo_decisions')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDecision(data as DecisionRow);
}

export function formatDirectiveBriefLine(d: CEODirective): string {
  const override = d.isOverride ? ' [OVERRIDE]' : '';
  const project = d.targetProjectId ? ` (${d.targetProjectId})` : '';
  return `${d.title}${override}${project}: ${d.directive}`;
}

export function formatDecisionBriefLine(d: CEODecision): string {
  const owner = d.owner ? ` · owner: ${d.owner}` : '';
  const due = d.dueDate ? ` · due: ${d.dueDate}` : '';
  return `[${d.decisionStatus}] ${d.decisionTitle}${owner}${due}`;
}
