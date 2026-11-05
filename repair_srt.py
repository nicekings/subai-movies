import pathlib, re

path = pathlib.Path('Zip.Wire.2026.vi.srt')
text = path.read_text(encoding='utf-8-sig')
pat = re.compile(r'(?m)^(\d+)\r?\n(\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3})\r?\n')
matches = list(pat.finditer(text))
items = {}
for i, m in enumerate(matches):
    end = matches[i+1].start() if i+1 < len(matches) else len(text)
    dialogue = text[m.end():end].strip()
    items[int(m.group(1))] = [m.group(2), dialogue]

# Repair the four marker-loss points from the source wording and restore clean block boundaries.
fixes = {356: 'Không, không, không.', 357: 'Không.', 519: 'Anh', 520: 'có', 521: 'biết điều tôi không hiểu là gì?'}
for n, dialogue in fixes.items():
    items[n][1] = dialogue
out = '\n\n'.join(f'{n}\n{items[n][0]}\n{items[n][1]}' for n in sorted(items)) + '\n'
path.write_text(out, encoding='utf-8-sig', newline='')
print(f'{len(items)} entries; {sum(not v[1] for v in items.values())} empty')
