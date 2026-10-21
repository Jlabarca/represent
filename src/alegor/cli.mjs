import { createServer } from './server.mjs';
import { capture, compare, defaultStoreDir, listSnapshots, loadProjects } from './core.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const store = defaultStoreDir(workspace);
const [command = 'help', ...args] = process.argv.slice(2);
const help = `Alegor · local project re-entry\n\nCommands:\n  capture <config.json> <project-id>\n  list <config.json> <project-id>\n  brief <config.json> <project-id> <snapshot-id> [baseline-id]\n  serve <config.json> [--port 8874]\n\nSnapshots are manual, local and immutable. Store: ${store}\n`;

try {
  if (command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write(help);
  } else if (command === 'serve') {
    const config = args[0];
    const flag = args.indexOf('--port');
    const port = flag >= 0 ? Number(args[flag + 1]) : 8874;
    const projects = loadProjects(config);
    const server = createServer({ projects, storeDir: store, port });
    server.listen(port, '127.0.0.1', () => process.stdout.write(`Alegor listening at http://127.0.0.1:${port}/\nStore: ${store}\n`));
  } else {
    const [config, projectId, currentId, baselineId] = args;
    const projects = loadProjects(config);
    const project = projects.find((item) => item.id === projectId);
    if (!project) throw new Error(`Unknown configured project: ${projectId}`);
    if (command === 'capture') {
      const snapshot = capture(project, store);
      process.stdout.write(`${JSON.stringify({ id: snapshot.id, revision: snapshot.revision, reused: snapshot.reused, commits: snapshot.git.commits.length, docs: snapshot.discovery.docs.length, bytes: snapshot.discovery.bytes }, null, 2)}\n`);
    } else if (command === 'list') {
      process.stdout.write(`${JSON.stringify(listSnapshots(project, store).map(({ id, revision, generatedAt, git, projectName }) => ({ id, revision, generatedAt, head: git.head, branch: git.branch, projectName })), null, 2)}\n`);
    } else if (command === 'brief') {
      if (!currentId) throw new Error('brief requires a snapshot id.');
      process.stdout.write(`${JSON.stringify(compare(project, store, currentId, baselineId), null, 2)}\n`);
    } else {
      process.stdout.write(help);
      process.exitCode = 2;
    }
  }
} catch (error) {
  process.stderr.write(`Alegor: ${error.message}\n`);
  process.exitCode = 1;
}
