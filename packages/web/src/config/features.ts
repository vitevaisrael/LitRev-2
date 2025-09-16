export const flags = {
  GLOBAL_MENU: import.meta.env.VITE_FEATURE_GLOBAL_MENU === '1',
  HOME: import.meta.env.VITE_FEATURE_HOME === '1',
  HOME_AI: import.meta.env.VITE_FEATURE_HOME_AI === '1',
  PUBLIC_DEMO: import.meta.env.VITE_FEATURE_PUBLIC_DEMO === '1',
} as const;
// appended by HOME-002
(Object.assign as any)(flags, {
  HOME_AS_DEFAULT: import.meta.env.VITE_FEATURE_HOME_AS_DEFAULT === '1',
});

// appended by HOME-003
// (runtime merge keeps the existing export; consumers should read via (flags as any).COMMAND_MENU)
(Object.assign as any)(flags, {
  COMMAND_MENU: import.meta.env.VITE_FEATURE_COMMAND_MENU === '1',
  QUICK_SWITCHER: import.meta.env.VITE_FEATURE_QUICK_SWITCHER === '1',
});
