// represent.artifact/v0: the record every Represent tool can write and the hub can index.
// Defined in docs/research/reports/Represent within Orkest platform design.md § 4.1.
// id is content-addressed over everything except `task` and `view.url`.
import { createHash } from 'node:crypto';

export const ARTIFACT_SCHEMA = 'represent.artifact/v0';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}

export function artifactId(record) {
  const { task, view, id, ...rest } = record;
  const body = { ...rest, view: view ? { ...view, url: undefined } : undefined };
  return `sha256:${createHash('sha256').update(JSON.stringify(canonical(body))).digest('hex')}`;
}

/** Build a record. Throws on a shape the hub could not index. */
export function buildRecord({ tool, project, revision, scope, evidence = [], view = null, task = null, provenance = { inference: 'none', model: null, cost: null } }) {
  const record = {
    schema: ARTIFACT_SCHEMA,
    tool: { name: String(tool.name), version: String(tool.version) },
    project: { hostId: String(project.hostId), repoRoot: String(project.repoRoot), remote: project.remote ?? null },
    revision: { ref: revision.ref ?? null, sha: revision.sha ?? null, dirty: Boolean(revision.dirty), capturedAt: String(revision.capturedAt) },
    scope: { kind: String(scope.kind), summary: String(scope.summary).slice(0, 300) },
    evidence: evidence.map(e => ({ path: String(e.path), lines: [Number(e.lines[0]), Number(e.lines[1])], hash: String(e.hash) })),
    view: view ? { url: view.url ?? null, static: view.static ?? null } : null,
    provenance: { inference: String(provenance.inference ?? 'none'), model: provenance.model ?? null, cost: provenance.cost ?? null, ...(provenance.promptVersion ? { promptVersion: provenance.promptVersion } : {}) },
  };
  if (task) record.task = { hostId: String(task.hostId), issue: task.issue ?? null, box: task.box ?? null };
  const problems = validateRecord({ ...record, id: 'sha256:pending' });
  if (problems.length) throw new Error(`Artifact record invalid: ${problems.join('; ')}`);
  return { ...record, id: artifactId(record) };
}

/** Returns a list of problems; empty means valid. */
export function validateRecord(r) {
  const p = [];
  if (r?.schema !== ARTIFACT_SCHEMA) p.push('schema');
  if (!/^sha256:[0-9a-f]{64}$|^sha256:pending$/.test(r?.id ?? '')) p.push('id');
  if (!r?.tool?.name || !r.tool.version) p.push('tool');
  if (!r?.project?.hostId || !r.project.repoRoot) p.push('project');
  if (!r?.revision?.capturedAt || Number.isNaN(Date.parse(r.revision.capturedAt))) p.push('revision.capturedAt');
  if (!r?.scope?.kind || !r.scope.summary) p.push('scope');
  if (!Array.isArray(r?.evidence) || r.evidence.some(e => !e.path || !Array.isArray(e.lines) || e.lines.length !== 2 || !Number.isInteger(e.lines[0]) || !Number.isInteger(e.lines[1]) || e.lines[0] < 1 || e.lines[1] < e.lines[0] || !/^[0-9a-f]{64}$/.test(e.hash ?? ''))) p.push('evidence');
  if (!['none', 'model'].includes(r?.provenance?.inference)) p.push('provenance.inference');
  if (r?.provenance?.inference === 'model' && !r.provenance.model) p.push('provenance.model');
  if (r?.id && r.id !== 'sha256:pending' && artifactId(r) !== r.id) p.push('id does not match content');
  return p;
}
