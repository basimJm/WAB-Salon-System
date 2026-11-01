import { runStorageCors } from './corsSetup';

/** `npm run storage:cors` (see `corsSetup.ts`). */
void runStorageCors({
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
}).then((code) => {
  process.exitCode = code;
});
