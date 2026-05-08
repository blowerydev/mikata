type ProcessLike = {
  env?: {
    NODE_ENV?: string;
  };
};

const runtimeGlobal = globalThis as typeof globalThis & {
  __MIKATA_DEV__?: boolean;
  process?: ProcessLike;
};

export const __DEV__ =
  runtimeGlobal.__MIKATA_DEV__ ??
  (runtimeGlobal.process?.env?.NODE_ENV !== undefined &&
    runtimeGlobal.process.env.NODE_ENV !== 'production');
