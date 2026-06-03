import { spawnSync } from 'node:child_process';

const commands = [
  ['npm', ['test']],
  ['npm', ['run', 'example:rag']],
  ['npm', ['run', 'example:tool-output']]
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
