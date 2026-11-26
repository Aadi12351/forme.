"""Create WebP copies and update only image references; originals are retained.
Run: python scripts/optimise-images.py --write
Requires Pillow. Run a database backup before applying on a live store.
"""
from pathlib import Path
import sqlite3, json, sys
from PIL import Image, ImageOps
root=Path(__file__).resolve().parents[1]
if '--write' not in sys.argv: raise SystemExit('Use --write after backing up the database. Originals are retained.')
db=sqlite3.connect(root/'data/store.sqlite',timeout=10)
mapping={}
saved=0
for row in db.execute('SELECT data FROM products').fetchall():
 product=json.loads(row[0])
 urls=[product.get('image'),product.get('spotlightMedia'),product.get('detailMedia')]+[m.get('url') for m in product.get('media',[]) if m.get('type')=='image']
 for url in urls:
  if not isinstance(url,str) or not url.startswith(('/uploads/','/assets/')) or url in mapping: continue
  source=(root/'uploads'/url.removeprefix('/uploads/')) if url.startswith('/uploads/') else (root/'public'/url.removeprefix('/'))
  source=source.resolve()
  if not source.is_relative_to(root) or not source.exists() or source.suffix.lower() not in ('.png','.jpg','.jpeg','.webp'): continue
  target=source.with_suffix('.webp')
  if source.suffix.lower()=='.webp': continue
  with Image.open(source) as opened:
   im=ImageOps.exif_transpose(opened).convert('RGB')
   im.thumbnail((1600,1800))
   im.save(target,'WEBP',quality=88,method=6)
   variants=[]
   for width in (480,800):
    if im.width>width:
     variant=im.copy();variant.thumbnail((width,1800))
     out=target.with_name(target.stem+'-'+str(width)+'.webp');variant.save(out,'WEBP',quality=86,method=6)
     variants.append({'url':url.rsplit('.',1)[0]+'-'+str(width)+'.webp','width':variant.width})
   new_url=url.rsplit('.',1)[0]+'.webp'
   mapping[url]=(new_url,variants)
   saved+=max(0,source.stat().st_size-target.stat().st_size)
db.execute('BEGIN IMMEDIATE')
for id,raw in db.execute('SELECT id,data FROM products').fetchall():
 p=json.loads(raw);changed=False
 for key in ('image','spotlightMedia','detailMedia'):
  old=p.get(key)
  if old in mapping:
   p[key]=mapping[old][0];changed=True
   if key=='image':p['responsiveImages']=mapping[old][1]
 for i,m in enumerate(p.get('media',[])):
  if m.get('type')=='image' and m.get('url') in mapping:m['url']=mapping[m['url']][0];changed=True
  alt=m.get('alt','')
  if len(alt)==32 and all(c in 'abcdef0123456789' for c in alt.lower()):m['alt']=p['name']+' · view '+str(i+1);changed=True
 if changed:
  p['revision']=int(p.get('revision',0))+1
  db.execute('UPDATE products SET data=? WHERE id=?',(json.dumps(p,ensure_ascii=False),id))
db.commit();db.close()
print('Optimised',len(mapping),'images; main-image bytes saved:',saved,'(original files retained).')
