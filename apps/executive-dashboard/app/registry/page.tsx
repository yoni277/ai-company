import { loadPortfolioIntelligenceForDashboard } from '../../lib/portfolio-intelligence';
import { loadProjectRegistryView } from '../../lib/project-registry';
import { ProjectRegistryPanel } from '../../components/ProjectRegistryPanel';

export const dynamic = 'force-dynamic';

export default async function ProjectRegistryPage() {
  const { portfolio } = await loadPortfolioIntelligenceForDashboard();
  const { projects, validation, source } = await loadProjectRegistryView(portfolio);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Project Registry</h1>
        <p className="text-sm text-slate-500 mt-1">
          Data-driven project definitions · funnel stages · connector configuration
        </p>
      </header>

      <ProjectRegistryPanel rows={projects} source={source} valid={validation.valid} />
    </div>
  );
}
