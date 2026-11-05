export type Cue = { id: number; start: string; end: string; text: string };
const stamp = /(\d{2,}:\d{2}:\d{2}[.,]\d{3}|\d{2}:\d{2}[.,]\d{3})/;
function norm(s: string) {
  return (s.split(":").length === 2 ? "00:" : "") + s.replace(".", ",");
}
export function parse(raw: string): Cue[] {
  const blocks = raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n[ \t]*\n+/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    if (/^(WEBVTT|NOTE|STYLE|REGION)(?:\s|$)/.test(block)) continue;
    const lines = block.split("\n"),
      i = lines.findIndex((x) => x.includes("-->"));
    const m =
      i >= 0 &&
      i <= 1 &&
      lines[i].match(
        new RegExp(
          "^" + stamp.source + "\\s+-->\\s+" + stamp.source + "(?:\\s.*)?$",
        ),
      );
    const text = lines
      .slice(i + 1)
      .join("\n")
      .trim();
    if (
      !m ||
      !text ||
      !m
        .slice(1, 3)
        .every((x) => /^\d{2,}:[0-5]\d:[0-5]\d,\d{3}$/.test(norm(x)))
    )
      throw Error("Phụ đề có đoạn sai định dạng.");
    cues.push({
      id: cues.length + 1,
      start: norm(m[1]),
      end: norm(m[2]),
      text,
    });
  }
  if (!cues.length || cues.length > 20000)
    throw Error("Số đoạn phụ đề không hợp lệ.");
  return cues;
}
export function render(c: Cue[]) {
  return (
    c
      .map((x) => x.id + "\n" + x.start + " --> " + x.end + "\n" + x.text)
      .join("\n\n") + "\n"
  );
}
export function merge(c: Cue[], rows: any[]): Cue[] {
  if (!Array.isArray(rows) || rows.length !== c.length)
    throw Error("AI trả thiếu hoặc thừa câu.");
  if (rows.some((row) => !row || !Number.isInteger(row.id)) ||
      new Set(rows.map((row) => row.id)).size !== rows.length)
    throw Error("AI trả sai hoặc trùng ID câu.");
  const byId = new Map(rows.map((x) => [x.id, x.text]));
  return c.map((x) => {
    const t = byId.get(x.id);
    if (typeof t !== "string" || !t.trim() || /-->/.test(t))
      throw Error("AI trả sai ID hoặc nội dung.");
    return {
      ...x,
      text: t
        .trim()
        .replace(/\r/g, "")
        .replace(/\n\s*\n/g, "\n"),
    };
  });
}
export function batches(c: Cue[]) {
  const groups: Cue[][] = [];
  let group: Cue[] = [],
    size = 0;
  for (const cue of c) {
    if (group.length && (size + cue.text.length > 6000 || group.length >= 50)) {
      groups.push(group);
      group = [];
      size = 0;
    }
    group.push(cue);
    size += cue.text.length;
  }
  if (group.length) groups.push(group);
  return groups;
}
