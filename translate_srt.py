import json, re, time, urllib.parse, urllib.request, concurrent.futures, pathlib, sys

src = pathlib.Path(sys.argv[1])
dst = pathlib.Path(sys.argv[2])
raw = src.read_text(encoding='utf-8-sig')
blocks = re.split(r'\r?\n\s*\r?\n', raw.strip())
parsed=[]
for b in blocks:
    lines=b.splitlines()
    if len(lines)>=3 and '-->' in lines[1]:
        parsed.append([lines[0], lines[1], '\n'.join(lines[2:])])
    else:
        parsed.append(None)

batches=[]; batch=[]; size=0
for i,p in enumerate(parsed):
    if not p: continue
    text=p[2].replace('\n',' ')
    marker=f'ZXQ{i:04d}QXZ'
    part=f'{marker} {text}'
    if batch and size+len(part)>650:
        batches.append(batch); batch=[]; size=0
    batch.append((i,marker,text)); size+=len(part)+1
if batch: batches.append(batch)

def translate(item):
    n, group=item
    q=' '.join(f'{marker} {text}' for _,marker,text in group)
    url='https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=vi&q='+urllib.parse.quote(q)
    last=None
    for attempt in range(6):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=30) as r: data=json.loads(r.read().decode('utf-8'))
            result=data[0] if isinstance(data,list) else ''
            found=re.findall(r'ZXQ\d{4}QXZ',result)
            if len(found)!=len(group): raise ValueError(f'marker mismatch {n}: {found}')
            chunks=re.split(r'ZXQ\d{4}QXZ',result)
            return [(idx, chunks[j+1].strip()) for j,(idx,_,_) in enumerate(group)]
        except Exception as e:
            last=e; time.sleep(min(2**attempt,20))
    # Some long responses drop a marker; fall back to one subtitle per request.
    result=[]
    for idx,marker,text in group:
        url='https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=vi&q='+urllib.parse.quote(text)
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=30) as r: data=json.loads(r.read().decode('utf-8'))
        result.append((idx, data[0] if isinstance(data,list) else text))
    return result

translated={}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
    futures=[ex.submit(translate,(j,g)) for j,g in enumerate(batches)]
    for j,f in enumerate(concurrent.futures.as_completed(futures),1):
        for idx,text in f.result(): translated[idx]=text
        if j%10==0: print(f'{j}/{len(batches)} batches',flush=True)

out=[]
for i,p in enumerate(parsed):
    if p:
        text=translated.get(i,p[2])
        out.append('\n'.join((p[0],p[1],text.replace(' | ','\n'))))
    elif out and out[-1] != '':
        out.append('')
dst.write_text('\n'.join(out).rstrip()+'\n',encoding='utf-8-sig')
print(f'Wrote {dst}: {len(translated)} subtitles')
