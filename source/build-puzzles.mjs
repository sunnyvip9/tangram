import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import assert from 'node:assert/strict';
const here=dirname(fileURLToPath(import.meta.url));
const source=resolve(here,'library-1000.json');
const out=resolve(here,'..');
const data=JSON.parse(readFileSync(source,'utf8'));
assert.equal(data.puzzles.length,1000);
// A union silhouette avoids antialiasing seams between adjacent filled polygons.
const outlines=JSON.parse(execFileSync('python',['-c',`
import json,sys
from shapely import set_precision
from shapely.geometry import Polygon
from shapely.ops import unary_union
data=json.load(open(sys.argv[1],encoding='utf8'))
result=[]
for puzzle in data['puzzles']:
    points=[p for piece in puzzle['pieces'].values() for p in piece]
    x0,y0=min(p[0] for p in points),min(p[1] for p in points)
    x1,y1=max(p[0] for p in points),max(p[1] for p in points)
    scale=min(115,850/(x1-x0),590/(y1-y0))
    ox,oy=540-scale*(x0+x1)/2,400-scale*(y0+y1)/2
    shape=unary_union([set_precision(Polygon(v),1e-8) for v in puzzle['pieces'].values()])
    polygons=[shape] if shape.geom_type=='Polygon' else list(shape.geoms)
    paths=[]
    for polygon in polygons:
        for ring in [polygon.exterior,*polygon.interiors]:
            coords=list(ring.coords)[:-1]
            paths.append('M'+'L'.join(f'{ox+scale*x:.6f},{oy+scale*y:.6f}' for x,y in coords)+'Z')
    result.append(''.join(paths))
print(json.dumps(result))
`,source],{encoding:'utf8'}));
data.puzzles.forEach((p,i)=>{p.outlinePath=outlines[i];});
writeFileSync(`${out}/puzzles.js`,`/* Generated from library-1000.json. See README for source credits. */\nwindow.TANGRAM_PUZZLES=${JSON.stringify(data.puzzles)};\n`);

console.log('Built 1000 puzzles from bundled source data.');
