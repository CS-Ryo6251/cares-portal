"""Extract standard home/day-care estimates from final MHLW R8.6 Excel.

Usage: python3 scripts/build-simulation-tariffs.py /path/to/care.zip /path/to/community.zip
Only explicitly mapped standard base codes and supported add-ons are published.
Composite reductions, municipal prevention tariffs and medical-insurance fees are
not inferred. Keep Excel coordinates and hashes for independent PDF verification.
"""
import collections, hashlib, io, json, re, sys, unicodedata, zipfile
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SHEETS = {'訪問介護':'11', '訪問入浴':'12', '訪問看護':'13', '訪問リハ':'14',
          '通所介護':'15', '通所リハビリ':'16', '地域通所介護':'78'}
URLS = ['https://www.wam.go.jp/gyoseiShiryou-files/documents/2026/0521184041930/20260522_013.zip',
        'https://www.wam.go.jp/gyoseiShiryou-files/documents/2026/052118405922/20260522_015.zip']
def norm(v): return unicodedata.normalize('NFKC',str(v or '')).strip()

def base(prefix,name):
    if prefix == '15':
        m=re.fullmatch(r'通所介護(I{1,3})([1-6])([1-5])',name)
        if m:
            scale,t,care=m.groups(); h=int(t)+2
            return {'care':int(care),'group':{'I':'通常規模型','II':'大規模型Ⅰ','III':'大規模型Ⅱ'}[scale], 'duration':f'{h}時間以上{h+1}時間未満'}
    if prefix == '78':
        m=re.fullmatch(r'地域通所介護([1-6])([1-5])',name)
        if m:
            t,care=m.groups(); h=int(t)+2
            return {'care':int(care),'group':'地域密着型','duration':f'{h}時間以上{h+1}時間未満'}
    if prefix == '16':
        m=re.fullmatch(r'通所リハ(I{1,3})([1-3])([1-7])([1-5])',name)
        if m:
            scale,provider,t,care=m.groups(); h=int(t)
            group={'I':'通常規模型','II':'大規模型','III':'大規模型（一定の要件を満たす事業所）'}[scale]
            group+='・'+{'1':'病院・診療所','2':'老健','3':'介護医療院'}[provider]
            return {'care':int(care),'group':group,'duration':f'{h}時間以上{h+1}時間未満'}
    if prefix == '11':
        m=re.fullmatch(r'身体介護([1-8])',name)
        if m:
            n=int(m[1]); minutes=60+(n-3)*30
            time='20分以上30分未満' if n==1 else '30分以上1時間未満' if n==2 else f'{minutes}分以上{minutes+30}分未満'
            return {'care':0,'group':'身体介護','duration':time}
        if name in ['生活援助2','生活援助3','通院等乗降介助']:
            return {'care':0,'group':'通院等乗降介助' if name=='通院等乗降介助' else '生活援助','duration':{'生活援助2':'20分以上45分未満','生活援助3':'45分以上','通院等乗降介助':'1回'}[name]}
    if prefix == '12' and name=='訪問入浴': return {'care':0,'group':'看護職員1人・介護職員2人','duration':'1回'}
    if prefix == '13':
        m=re.fullmatch(r'訪看(I{1,2})([1-5])',name)
        if m:
            provider,t=m.groups()
            return {'care':0,'group':'訪問看護ステーション' if provider=='I' else '病院・診療所','duration':{'1':'20分未満','2':'30分未満','3':'30分以上1時間未満','4':'1時間以上1時間30分未満','5':'PT・OT・STによる訪問（20分）'}[t]}
    if prefix == '14':
        m=re.fullmatch(r'訪問リハビリ([1-3])',name)
        if m: return {'care':0,'group':{'1':'病院・診療所','2':'老健','3':'介護医療院'}[m[1]],'duration':'20分（1回分）'}
    return None

rows=[];sources=[]
for source_index,source in enumerate(sys.argv[1:3]):
    archive=zipfile.ZipFile(source)
    raw=archive.read(next(n for n in archive.namelist() if n.endswith('.xlsx')))
    sources.append({'url':URLS[source_index],'sha256':hashlib.sha256(raw).hexdigest()})
    book=openpyxl.load_workbook(io.BytesIO(raw),data_only=True,read_only=True)
    for sheet in book:
        if sheet.title not in SHEETS: continue
        data=list(sheet.iter_rows(values_only=True)); prefix=SHEETS[sheet.title]
        unit_cols={i for row in data[:10] for i,v in enumerate(row) if norm(v)=='合成'}
        assert len(unit_cols)==1
        u=unit_cols.pop(); f=u+2 if prefix in ['15','16'] else u+1
        frequency=''
        for n,row in enumerate(data,1):
            if norm(row[0])!=prefix: continue
            if row[f] is not None: frequency=norm(row[f])
            code=prefix+norm(row[1]); name=norm(row[2]); details=base(prefix,name)
            addon=''
            if '処遇改善加算' in name and '・' not in name: addon='処遇改善'
            if prefix in ['15','78']:
                if re.search(r'入浴介助加算I{1,2}$',name): addon='入浴介助'
                if re.search(r'個別機能訓練加算I[12]$',name): addon='個別機能訓練Ⅰ'
                if name.endswith('個別機能訓練加算II'): addon='個別機能訓練Ⅱ'
                if name.endswith('科学的介護推進体制加算'): addon='科学的介護'
                if re.search(r'サービス提供体制加算I{1,3}$',name): addon='サービス提供体制'
            if details is None and not addon: continue
            value=row[u]; rate=None
            if addon=='処遇改善':
                ratios=[norm(v) for v in row[3:u] if re.fullmatch(r'\d+/\d+',norm(v))]
                assert len(ratios)==1,(code,ratios)
                a,b=map(int,ratios[0].split('/'));rate=a/b;value=0
            assert isinstance(value,(int,float)) and int(value)==value,(code,value)
            limit_units=row[u+1] if prefix in ['15','16'] else None
            rows.append({'code':code,'name':name,'units':int(value),'limitUnits':int(limit_units) if isinstance(limit_units,(int,float)) else int(value),
                         'frequency':frequency,'monthly':frequency=='1月につき','rate':rate,'addonGroup':addon,
                         'limitExcluded':addon in ['処遇改善','サービス提供体制'],
                         **(details or {'care':0,'group':'','duration':''}), 'sheet':sheet.title,'row':n})

assert len({r['code'] for r in rows})==len(rows)
counts=dict(collections.Counter(r['code'][:2] for r in rows if not r['addonGroup']))
assert counts=={'11':11,'12':1,'13':9,'14':3,'15':90,'16':315,'78':30},counts
out={'effectiveFrom':'2026-06-01','reference':'https://www.wam.go.jp/gyoseiShiryou/detail?ct=020050010&gno=22560',
     'sources':sources,'rows':rows}
path=ROOT/'data/simulation-tariffs-2026-06.json';path.parent.mkdir(exist_ok=True)
path.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'baseCounts':counts,'total':len(rows)},ensure_ascii=False))
