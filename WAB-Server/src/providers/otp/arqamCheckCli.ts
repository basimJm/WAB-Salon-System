import { runArqamCheck } from './arqamCheck';

const FIRST_ARGUMENT_INDEX = 2;

/** `npm run otp:arqam-check [-- --send +9627XXXXXXXX --lang ar|en]` (see `arqamCheck.ts`). */
void runArqamCheck(process.argv.slice(FIRST_ARGUMENT_INDEX), {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
}).then((code) => {
  process.exitCode = code;
});
