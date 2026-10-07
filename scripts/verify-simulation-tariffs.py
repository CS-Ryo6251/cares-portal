"""Compare all shipped units/rates and limit-management units with official PDF text.
Usage: python3 scripts/verify-simulation-tariffs.py care.txt community.txt
The text must be independently produced with pdftotext -layout.
"""
import json,re,sys,unicodedata
from pathlib import Path
root=Path(__file__).resolve().parents[1]
expected={r['code']:r for r in json.loads((root/'data/simulation-tariffs-2026-06.json').read_text())['rows']}
seen={}
for file in sys.argv[1:]:
 text=unicodedata.normalize('NFKC',Path(file).read_text())
 matches=list(re.finditer(r'^([0-9A-Z]{2})\s+([0-9A-Z]{4})\s+',text,re.M))
 for i,m in enumerate(matches):
  code=m[1]+m[2]
  if code not in expected:continue
  r=expected[code]
  block=text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)].split('\f')[0]
  if r['rate'] is not None:
   ratio=re.search(r'(\d+)/(\d+)',block)
   assert ratio,(code,block)
   seen[code]={'rate':int(ratio[1])/int(ratio[2])}
  else:
   value=re.search(r'単位(?:加算)?[ \t]+([\d,]+)(?:[ \t]+([\d,]+)(?=[ \t]+|$))?',block,re.M)
   if value:
    unit=int(value[1].replace(',',''));limit=int(value[2].replace(',','')) if value[2] else unit
   else:
    value=re.search(r'\s{2,}([\d,]+)(?:\s*1回につき)?\s*$',block,re.M)
    assert value,(code,block)
    unit=limit=int(value[1].replace(',',''))
   seen[code]={'units':unit,'limitUnits':limit}
issues=[{'code':c,'expected':{k:r[k] for k in found},'pdf':found} for c,r in expected.items() if (found:=seen.get(c,{}))=={} or any(r[k]!=v for k,v in found.items())]
result={'expected':len(expected),'pdfCodes':len(seen),'mismatches':len(issues),'issues':issues}
print(json.dumps(result,ensure_ascii=False,indent=2));assert not issues
