import { iso6393 } from "iso-639-3";
const names = new Intl.DisplayNames(["vi"], { type: "language" });
export const languages = iso6393
  .filter((l) => l.iso6391)
  .map((l) => ({
    code: l.iso6391!,
    iso: l.iso6393,
    bibliographic: l.iso6392B,
    en: l.name,
    name: names.of(l.iso6391!)!,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "vi"));
export function language(code: string) {
  return languages.find((l) => l.code === code);
}
export const services = {
  or: "OpenRouter",
  openai: "OpenAI",
  gemini: "Google Gemini",
  claude: "Anthropic (Claude)",
  grok: "xAI (Grok)",
  mistral: "Mistral AI",
  ds: "DeepSeek",
  google: "Google Cloud Translate",
  custom: "Custom Provider",
};
export const modelServices = Object.keys(services).filter(
  (k) => k !== "google" && k !== "custom",
);
export const aiSourceNames = { subdl: "SubDL", ss: "SubSource", osauth: "OpenSubtitles Auth", os: "OpenSubtitles V3" };
export const defaults = {
  osAuth: false,
  directOnly: false,
  subdl: true,
  addons: [] as string[],
  main: "or",
  secondary: "",
  workflow: "json",
  sources: ["en"],
  targets: ["vi"],
  dsModel: "",
  orModel: "",
};
export function customTimeoutSeconds(value: unknown = 60): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 60 ||
    value > 300
  )
    throw Error(
      "Thời gian chờ Custom Provider phải là số nguyên từ 60 đến 300 giây.",
    );
  return value;
}
export function preferences(input: any) {
  const p = { ...defaults, ...input };
  const aiSourceMode = p.aiSourceMode ?? 'auto';
  const aiSourceOrder: string[] = p.aiSourceOrder ?? Object.keys(aiSourceNames);
  if (!['auto','custom'].includes(aiSourceMode) || !Array.isArray(aiSourceOrder) || aiSourceOrder.some(k => !Object.hasOwn(aiSourceNames,k)) || new Set(aiSourceOrder).size !== aiSourceOrder.length) throw Error('Nguồn dịch AI không hợp lệ.');
  const others: string[] = p.others ?? (p.secondary ? [p.secondary] : []);
  if (
    !Object.hasOwn(services, p.main) ||
    !Array.isArray(others) ||
    others.some(
      (k) =>
        typeof k !== "string" || !Object.hasOwn(services, k) || k === p.main,
    ) ||
    new Set(others).size !== others.length
  )
    throw Error("Danh sách nhà cung cấp dịch không hợp lệ.");
  if (!["json", "xml"].includes(p.workflow))
    throw Error("Quy trình dịch không hợp lệ.");
  for (const [k, max] of [
    ["sources", 3],
    ["targets", 6],
  ] as const) {
    const a = p[k];
    if (
      !Array.isArray(a) ||
      !a.length ||
      a.length > max ||
      a.some((x) => !language(x)) ||
      new Set(a).size !== a.length
    )
      throw Error(
        "Chọn từ 1 đến " +
          max +
          " ngôn ngữ " +
          (k === "sources" ? "nguồn." : "đích."),
      );
  }
  return {
    aiSourceMode,
    aiSourceOrder,
    osAuth: p.osAuth === true,
    directOnly: p.directOnly === true,
    subdl: p.subdl !== false,
    addons: Array.isArray(p.addons)
      ? [
          ...new Set<string>(
            p.addons.filter((k) => ["os", "pro", "ss", "sense"].includes(k)),
          ),
        ]
      : [],
    main: p.main,
    others,
    workflow: p.workflow,
    batchContext: p.batchContext === true,
    customTimeout: customTimeoutSeconds(p.customTimeout),
    customEndpoint: String(p.customEndpoint || "").trim(),
    customModel: String(p.customModel || "").trim(),
    sources: p.sources,
    targets: p.targets,
    orModel: String(p.orModel || ""),
    dsModel: String(p.dsModel || ""),
    ...Object.fromEntries(
      modelServices.map((k) => [k + "Model", String(p[k + "Model"] || "")]),
    ),
  };
}
