import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Expo Go logs these on every reload; they are not app bugs. */
const IGNORE = [
  /Codegen didn't run/,
  /expo-notifications/,
  /not fully supported in Expo Go/,
];

function shouldIgnore(args) {
  const msg = args
    .map((value) => (typeof value === 'string' ? value : value?.message || String(value)))
    .join(' ');
  return IGNORE.some((pattern) => pattern.test(msg));
}

if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
  const warn = console.warn.bind(console);
  const error = console.error.bind(console);
  console.warn = (...args) => {
    if (!shouldIgnore(args)) warn(...args);
  };
  console.error = (...args) => {
    if (!shouldIgnore(args)) error(...args);
  };
}
