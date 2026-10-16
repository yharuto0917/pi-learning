import { type ComponentType, type LazyExoticComponent, lazy } from "react";

// レッスンごとに分割して読み込み、初回表示を軽くする
export const lessonComponents: Record<string, LazyExoticComponent<ComponentType>> = {
  "basics/what-is-pi": lazy(() => import("./basics/what-is-pi").then((m) => ({ default: m.WhatIsPiLesson }))),
  "basics/first-run": lazy(() => import("./basics/first-run").then((m) => ({ default: m.FirstRunLesson }))),
  "basics/interactive": lazy(() =>
    import("./basics/interactive").then((m) => ({ default: m.InteractiveLesson })),
  ),
  "basics/how-pi-works": lazy(() =>
    import("./basics/how-pi-works").then((m) => ({ default: m.HowPiWorksLesson })),
  ),
  "basics/sessions": lazy(() => import("./basics/sessions").then((m) => ({ default: m.SessionsLesson }))),
  "customize/choose-mechanism": lazy(() =>
    import("./customize/choose-mechanism").then((m) => ({ default: m.ChooseMechanismLesson })),
  ),
  "customize/configuration": lazy(() =>
    import("./customize/configuration").then((m) => ({ default: m.ConfigurationLesson })),
  ),
  "customize/prompt-templates": lazy(() =>
    import("./customize/prompt-templates").then((m) => ({ default: m.PromptTemplatesLesson })),
  ),
  "customize/skills": lazy(() => import("./customize/skills").then((m) => ({ default: m.SkillsLesson }))),
  "customize/extensions": lazy(() =>
    import("./customize/extensions").then((m) => ({ default: m.ExtensionsLesson })),
  ),
  "customize/themes-packages": lazy(() =>
    import("./customize/themes-packages").then((m) => ({ default: m.ThemesPackagesLesson })),
  ),
  "harness/harness-layers": lazy(() =>
    import("./harness/harness-layers").then((m) => ({ default: m.HarnessLayersLesson })),
  ),
  "harness/pi-ai": lazy(() => import("./harness/pi-ai").then((m) => ({ default: m.PiAiLesson }))),
  "harness/agent-core": lazy(() =>
    import("./harness/agent-core").then((m) => ({ default: m.AgentCoreLesson })),
  ),
  "harness/sdk": lazy(() => import("./harness/sdk").then((m) => ({ default: m.SdkLesson }))),
  "harness/rpc-modes": lazy(() => import("./harness/rpc-modes").then((m) => ({ default: m.RpcModesLesson }))),
  "harness/build-harness": lazy(() =>
    import("./harness/build-harness").then((m) => ({ default: m.BuildHarnessLesson })),
  ),
};
