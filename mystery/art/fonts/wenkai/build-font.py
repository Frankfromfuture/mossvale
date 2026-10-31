from pathlib import Path
from fontTools.ttLib import TTFont
import shutil, hashlib, json
root=Path(__file__).resolve().parent
font=TTFont(root/'LXGWWenKaiLite-Regular.ttf')
# Rename the converted web font; glyphs, coverage and license stay unchanged.
names={1:'Mossvale Kai',2:'Regular',3:'MossvaleKai-Regular',4:'Mossvale Kai Regular',6:'MossvaleKai-Regular',16:'Mossvale Kai',17:'Regular',18:'Mossvale Kai Regular'}
for record in font['name'].names:
 if record.nameID in names:
  record.string=names[record.nameID].encode(record.getEncoding())
font.flavor='woff2'
out=root.parents[2]/'public/fonts';out.mkdir(parents=True,exist_ok=True)
font.save(out/'MossvaleKai-Regular.woff2')
shutil.copyfile(root/'OFL.txt',out/'MossvaleKai-OFL.txt')
source='https://github.com/lxgw/LxgwWenKai-Lite'
report={'source':source,'license':'SIL OFL 1.1','source_sha256':hashlib.sha256((root/'LXGWWenKaiLite-Regular.ttf').read_bytes()).hexdigest(),'family':'Mossvale Kai','glyphs_unchanged':True,'bytes':(out/'MossvaleKai-Regular.woff2').stat().st_size}
(root/'source.json').write_text(json.dumps(report,indent=2)+'\n')
(out/'README.txt').write_text('Mossvale Kai Regular is a renamed WOFF2 conversion of LXGW WenKai Lite Regular.\nSource: '+source+'\nCopyright and license: MossvaleKai-OFL.txt\nGlyph shapes and coverage are unchanged.\n')
print(json.dumps(report))
