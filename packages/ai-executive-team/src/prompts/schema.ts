export const boardDigestSchemaText = `
interface BoardDigestOutput {
  headline: string;
  companyVerdict: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
  executiveSnapshot: Array<{
    executiveId: string;
    displayName: string;
    headline: string;
    health: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived' | '';  // empty = no report yet
    topPriority: string;
  }>;
  convergentThemes: Array<{
    theme: string;                       // 1 sentence
    affectedProjects: string[];          // project slugs
    surfacedBy: string[];                // executive ids that flagged this
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  tensions: Array<{
    title: string;
    description: string;                 // 1-2 sentences explaining the disagreement
    parties: Array<{ executiveId: string; position: string }>;
    recommendedResolution: string;       // your read on how the CEO should resolve it
  }>;
  strategicMoves: Array<{
    rank: number;                        // 1-based
    title: string;
    rationale: string;
    contributingExecutives: string[];    // executive ids whose recommendations this synthesizes
  }>;
  ceoOpenQuestions: string[];            // decisions the synthesis cannot make alone
  generatedAt: string;                   // ISO timestamp
}
`.trim();
