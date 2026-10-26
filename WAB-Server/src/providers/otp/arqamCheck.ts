import { randomInt } from 'node:crypto';
import { isOtpError, type ArqamChannel, type FetchLike } from '@wab/otp';
import { ConfigError, loadConfig, type AppConfig, type ArqamSettings } from '../../config';
import { LANGUAGES, type Language } from '../../constants/i18n';
import { ARQAM_OTP_MODE, E164_PATTERN } from '../../constants/providers';
import { SETTING_DEFAULTS } from '../../constants/settings';
import { createLogger } from '../../utils/logger';
import { createArqamChannelFromSettings } from './arqam';

export const ARQAM_CHECK_EXIT = { ok: 0, failed: 1, usage: 2 } as const;
export const ARQAM_CHECK_FLAGS = { send: '--send', lang: '--lang' } as const;
const CHECK_PURPOSE = 'LOGIN';
const DECIMAL_RADIX = 10;
const USAGE = `usage: npm run otp:arqam-check [-- ${ARQAM_CHECK_FLAGS.send} +9627XXXXXXXX ${ARQAM_CHECK_FLAGS.lang} ar|en]\n`;

export interface ArqamCheckIo {
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
  /** Environment source (defaults to `.env.<NODE_ENV>` + the process environment). */
  readonly env?: NodeJS.ProcessEnv;
  readonly fetch?: FetchLike;
  /** Test code generator (default: CSPRNG, `otp.length` digits). */
  readonly newCode?: (length: number) => string;
}

interface Args {
  readonly send?: string;
  readonly lang: Language;
}

const isLanguage = (value: string | undefined): value is Language =>
  LANGUAGES.some((language) => language === value);

/** `--send +E164 --lang ar|en`; `null` when the arguments are not understood. */
export const parseArqamCheckArgs = (argv: readonly string[]): Args | null => {
  let send: string | undefined;
  let lang: Language = LANGUAGES[0];
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === ARQAM_CHECK_FLAGS.send && value !== undefined && E164_PATTERN.test(value))
      send = value;
    else if (flag === ARQAM_CHECK_FLAGS.lang && isLanguage(value)) lang = value;
    else return null;
  }
  return send === undefined ? { lang } : { send, lang };
};

const randomCode = (length: number): string =>
  String(randomInt(0, DECIMAL_RADIX ** length)).padStart(length, '0');

const describeError = (error: unknown): string =>
  isOtpError(error)
    ? `${error.code}${typeof error.details['arqamError'] === 'string' ? ` (ARQAM ${error.details['arqamError']})` : ''}`
    : String(error instanceof Error ? error.name : error);

type Loaded = { readonly config: AppConfig; readonly arqam: ArqamSettings };

const loadArqam = (io: ArqamCheckIo): Loaded | string => {
  try {
    const config = io.env === undefined ? loadConfig() : loadConfig(io.env);
    const arqam = config.otp.arqam;
    if (config.providers.otp !== ARQAM_OTP_MODE || arqam === undefined)
      return `OTP_PROVIDER is not ${ARQAM_OTP_MODE}: nothing to check\n`;
    return { config, arqam };
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    return `invalid configuration:\n${error.problems.map((p) => `  - ${p.key} ${p.reason}`).join('\n')}\n`;
  }
};

const sendTest = async (channel: ArqamChannel, args: Args, io: ArqamCheckIo): Promise<void> => {
  const length = SETTING_DEFAULTS['otp.length'];
  const code = (io.newCode ?? randomCode)(length);
  const { id } = await channel.send({
    to: args.send ?? '',
    code,
    language: args.lang,
    purpose: CHECK_PURPOSE,
    ttlSec: SETTING_DEFAULTS['otp.codeTtlSec'],
  });
  io.out(`sent: messageId ${id}, template language ${args.lang}\n`);
  // A throwaway code: never stored, it cannot sign anyone in. Shown so the owner can compare.
  io.out(`test code in the message: ${code} (not stored; it cannot be used to sign in)\n`);
};

/**
 * `npm run otp:arqam-check`: reads the ARQAM account (mode live/test, balance) with the server's own
 * configuration; with `--send` it also sends one test OTP. Never prints the API key.
 */
export const runArqamCheck = async (argv: readonly string[], io: ArqamCheckIo): Promise<number> => {
  const args = parseArqamCheckArgs(argv);
  if (args === null) {
    io.err(USAGE);
    return ARQAM_CHECK_EXIT.usage;
  }
  const loaded = loadArqam(io);
  if (typeof loaded === 'string') {
    io.err(loaded);
    return ARQAM_CHECK_EXIT.usage;
  }
  const { config, arqam } = loaded;
  try {
    const channel = createArqamChannelFromSettings(arqam, {
      isProduction: config.isProduction,
      logger: createLogger({ level: 'silent' }),
      ...(io.fetch === undefined ? {} : { fetch: io.fetch }),
    });
    const account = await channel.getAccount();
    io.out(
      `ARQAM account: mode ${account.mode}, balance ${account.balance === undefined ? 'unknown' : String(account.balance)}, status ${account.status ?? 'unknown'}\n`,
    );
    io.out(
      `templates: ar=${arqam.templates.ar} en=${arqam.templates.en}; send IP: ${String(arqam.sendIp)}\n`,
    );
    if (args.send !== undefined) await sendTest(channel, args, io);
    return ARQAM_CHECK_EXIT.ok;
  } catch (error) {
    io.err(`ARQAM check failed: ${describeError(error)}\n`);
    return ARQAM_CHECK_EXIT.failed;
  }
};
