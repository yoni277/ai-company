import { envFromProcessEnv, type PlatformEnv } from '@ai-company/database';
import type {
  ProjectRegistryValidationResult,
  RegisteredProject,
} from '@ai-company/shared-types';
import { buildInMemoryRegistrySeed } from './seed-data';
import { loadRegistryFromSupabase } from './supabase-store';
import { validateProjectRegistry } from './validate';

export { validateProjectRegistry } from './validate';
export { buildInMemoryRegistrySeed } from './seed-data';

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
        if (projects.length > 0) {
          return { projects, source: 'database' };
        }
      } catch {
        // Fall back to in-memory seed when registry tables are not migrated yet.
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
