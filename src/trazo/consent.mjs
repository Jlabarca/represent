// Trazo consent store. Per-path, revocable, outside every project root.
// Zero model calls live here or anywhere else in src/trazo during week 1.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const CONSENT_SCHEMA = 'trazo.consent/v0';

export function defaultStoreDir() {
  if (process.env.TRAZO_STORE) return path.resolve(process.env.TRAZO_STORE);
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, 'Represent', 'trazo');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Represent', 'trazo');
  return path.join(os.homedir(), '.local', 'share', 'represent', 'trazo');
}

/** Resolve a folder to its physical path; refuse symlinks and junctions anywhere on the way. */
export function canonicalRoot(input) {
  const abs = path.resolve(input);
  const parsed = path.parse(abs);
  let cursor = parsed.root;
  for (const part of abs.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    const st = fs.lstatSync(cursor);
    if (st.isSymbolicLink()) throw new Error(`Symlink or junction on the path is not allowed: ${cursor}`);
  }
  if (!fs.statSync(abs).isDirectory()) throw new Error(`Not a directory: ${abs}`);
  return fs.realpathSync(abs);
}

export function projectSlug(root) {
  const base = path.basename(root).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'folder';
  return `${base}-${createHash('sha256').update(root.toLowerCase()).digest('hex').slice(0, 10)}`;
}

function isWithin(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

/** The store must never sit inside a consented folder, or a capture would read its own output. */
export function assertStoreOutside(storeDir, root) {
  const store = path.resolve(storeDir);
  if (isWithin(root, store) || isWithin(store, root)) throw new Error(`Trazo store must be outside the consented folder: ${store}`);
}

export class Consent {
  constructor(storeDir = defaultStoreDir()) {
    this.storeDir = path.resolve(storeDir);
    this.file = path.join(this.storeDir, 'consent.json');
    this.data = { schema: CONSENT_SCHEMA, paths: {} };
    this.load();
  }
  load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (parsed?.schema === CONSENT_SCHEMA && parsed.paths && typeof parsed.paths === 'object') this.data = parsed;
    } catch { /* first run */ }
    return this;
  }
  save() {
    fs.mkdirSync(this.storeDir, { recursive: true });
    const temp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(this.data, null, 2) + '\n');
    fs.renameSync(temp, this.file);
    return this;
  }
  key(root) { return process.platform === 'win32' ? root.toLowerCase() : root; }
  get(root) { return this.data.paths[this.key(root)] ?? null; }
  has(root) { return Boolean(this.get(root)); }
  grant(root, { budgetUsdPerDay = 0 } = {}) {
    if (!Number.isFinite(budgetUsdPerDay) || budgetUsdPerDay < 0) throw new Error('Budget must be a non-negative number of USD per day.');
    this.data.paths[this.key(root)] = { root, grantedAt: new Date().toISOString(), budgetUsdPerDay, quiet: false };
    return this.save();
  }
  revoke(root) { delete this.data.paths[this.key(root)]; return this.save(); }
  list() { return Object.values(this.data.paths); }
}

/** What Trazo will and will not read, in words a person can check before saying yes. */
export function readPlan() {
  return {
    reads: [
      'Text files Git tracks or does not ignore, up to 2000 files, 1 MiB each, 32 MiB in total',
      'Source code (.js .ts .py .cs .go .rs .java .kt .php .rb .vue .svelte .html .css .sql .sh .ps1), docs (.md .txt .rst .adoc) and manifests (.json .yaml .toml .ini)',
      'Git history: the last 40 commit subjects and the paths they touched, under this folder',
    ],
    neverReads: [
      'Secrets and credentials: .env*, *.pem, *.key, *.p12, *.pfx, *.crt, id_rsa, known_hosts, anything named secret(s) or credential(s)',
      'Dependencies and outputs: node_modules, vendor, dist, build, out, coverage, target, bin, obj, .next, .nuxt, .cache, .venv',
      'Binaries, images, audio, archives, databases, lock files, logs, minified or generated bundles',
      'Hidden folders and files (.git, .idea, .vscode and any dot-prefixed path)',
      'Folders named sessions, transcripts, private, personal, data, datasets or backups',
    ],
    sends: 'Nothing. Week-1 Trazo makes no network request and no model call. A later explanation step shows you the exact excerpts before the first paid call.',
    stores: 'Snapshots, sketches and this consent under the Trazo store, outside this folder.',
  };
}
