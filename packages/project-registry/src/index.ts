import { envFromProcessEnv, type PlatformEnv } from '@ai-company/database';
import type {
  ProjectRegistryValidationResult,
  RegisteredProject,
} from '@ai-company/shared-types';
import { buildInMemoryRegistrySeed } from './seed-data';
import { loadRegistryFromSupabase } from './supabase-store';
import { validateProjectRegistry } from './validate';

export { validateProjectRegistry } from './validate';
export {
  buildInMemoryRegistrySeed,
  registerInstanceRegistrySeed,
  __resetInstanceRegistrySeed,
  type InstanceRegistrySeedBuilder,
} from './seed-data';

/**
 * Project registry service — load and validate portfolio project configuration.
 * No AI. No LLM.
 */
export class ProjectRegistryService {
  constructor(private readonly env: PlatformEnv) {}

  async loadProjects(): Promise<{
    projects: RegisteredProject[];
    source: 'database' | 'in-memory';
  }> {
    if (this.env.dataMode === 'supabase') {
      if (!this.env.supabaseUrl || !this.env.supabaseServiceRoleKey) {
        throw new Error('ProjectRegistryService: supabase mode requires credentials');
      }
      try {
        const projects = await loadRegistryFromSupabase({
          url: this.env.supabaseUrl,
          serviceRoleKey: this.env.supabaseServiceRoleKey,
          ...(this.env.supabaseSchema ? { schema: this.env.supabaseSchema } : {}),
        });
        // A successful read is authoritative — INCLUDING an empty result. Zero
        // registered projects is a VALID state (a clean / freshly-cloned
        // instance). Do NOT fall back to the instance seed just because the
        // database is empty; that would make an empty registry impossible and
        // resurrect the previous company's seed (the registry-layer analogue of
        // the P006B boot-time auto-seed). The seed fallback below is reserved
        // for the genuine failure case: the registry tables can't be read
        // (not migrated / unreachable), which throws into the catch.
        return { projects, source: 'database' };
      } catch {
        // Fall back to in-memory seed only when the registry tables cannot be
        // read at all (not migrated yet / connection error) — never for a
        // successful-but-empty read.
      }
    }
    return { projects: buildInMemoryRegistrySeed(), source: 'in-memory' };
  }

  async loadAndValidate(): Promise<{
    projects: RegisteredProject[];
    validation: ProjectRegistryValidationResult;
    source: 'database' | 'in-memory';
  }> {
    const { projects, source } = await this.loadProjects();
    const validation = validateProjectRegistry(projects);
    return { projects, validation, source };
  }
}

export function projectRegistryFromEnv(): ProjectRegistryService {
  return new ProjectRegistryService(envFromProcessEnv());
}

export async function loadRegisteredProjects(): Promise<RegisteredProject[]> {
  const { projects } = await projectRegistryFromEnv().loadProjects();
  return projects;
}
