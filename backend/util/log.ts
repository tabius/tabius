const consoleDebug = console.debug;
const consoleError = console.error;
const consoleInfo = console.info;
const consoleLog = console.log;
const consoleWarn = console.warn;

const getLogMessagePrefix = (): string => `[${new Date().toISOString().replace('T', ' ').substring(0, 23)}]`;

export function installLogFunctions(): void {
  console.debug = (...args: unknown[]): void => consoleDebug(getLogMessagePrefix(), ...args);
  console.error = (...args: unknown[]): void => consoleError(getLogMessagePrefix(), ...args);
  console.info = (...args: unknown[]): void => consoleInfo(getLogMessagePrefix(), ...args);
  console.log = (...args: unknown[]): void => consoleLog(getLogMessagePrefix(), ...args);
  console.warn = (...args: unknown[]): void => consoleWarn(getLogMessagePrefix(), ...args);
}

