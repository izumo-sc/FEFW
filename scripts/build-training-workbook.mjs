import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const classes = require('../dist/other/character-weapons/classes-data.js');
export const tiers = ['初級職', '中級職', '上級職', '最上級職', '神将職'];
export const routes = ['カイ編', 'ディートリヒ編', 'セオドラ編', 'レダ編'];
export async function build(workbook) {
  const source = JSON.parse(await fs.readFile(new URL('../data/character-learnsets.json', import.meta.url), 'utf8'));
  const sheets = source.characters.map(c => workbook.worksheets.add(c.name));
  const validation = workbook.worksheets.add('入力規則');
  validation.showGridLines = false;
  validation.getRange('A1:F1').values = [[...tiers, '推奨ルート']];
  validation.getRange('A1:F1').format = {fill:'#203C53',font:{bold:true,color:'#FFFFFF'}};
  validation.getRange('A1:F25').format.columnWidth = 24;
  validation.getRange('A1:F25').format.rowHeight = 24;
  for (let i=0;i<6;i++) {
    const names = i===5 ? routes : classes.filter(c=>c.group===tiers[i]).map(c=>c.name);
    validation.getRangeByIndexes(1,i,names.length,1).values = names.map(n=>[n]);
  }
  const starts = [7,8,9,11,12];
  for (let i=0;i<sheets.length;i++) {
    const s=sheets[i]; s.showGridLines=false;
    s.getRange('A1:E15').format.font={name:'Yu Gothic',size:11,color:'#172B3A'};
    s.getRange('A1:A15').format.columnWidth=20;
    s.getRange('B1:E15').format.columnWidth=30;
    s.getRange('A1:E15').format.rowHeight=24;
    s.getRange('A2').values=[[source.characters[i].name]];
    s.getRange('A2').format.font={bold:true,size:15};
    s.getRange('A4:C4').values=[['兵種区分','最短育成','完熟育成']];
    s.getRange('A4:C4').format={fill:'#203C53',font:{bold:true,color:'#FFFFFF'}};
    s.mergeCells('C4:E4');
    s.getRange('C4:E4').format={fill:'#203C53',font:{bold:true,color:'#FFFFFF'}};
    s.getRange('C6:E6').values=[['1周目','2周目','3周目']];
    s.getRange('A5').values=[['推奨ルート']];
    s.getRange('B5:C5').format.fill='#FFF2CC';
    s.getRange('B5:C5').dataValidation={rule:{type:'list',formula1:`INDIRECT("'入力規則'!$F$2:$F$5")`},errorAlert:{style:'stop',title:'推奨ルート',message:'4主人公から1人を選択してください。'}};
    for (const [row,label] of [[6,'1部2部'],[10,'3部']]) {
      s.getRange(`A${row}`).values=[[label]];
      s.getRange(`A${row}:C${row}`).format={fill:'#E2EAF0',font:{bold:true}};
    }
    for (let tier=0;tier<5;tier++) {
      const row=starts[tier], col=String.fromCharCode(65+tier);
      s.getRange(`A${row}`).values=[[tiers[tier]]];
      const inputs=s.getRange(`B${row}:${tier<3 ? "E" : "C"}${row}`);
      inputs.format.fill='#FFF8E5';
      inputs.dataValidation={rule:{type:'list',formula1:`INDIRECT("'入力規則'!$${col}$2:$${col}$100")`}};
      inputs.format.borders={insideHorizontal:{style:'hair',color:'#E5E7EB'}};
    }
    s.mergeCells('A14:C14'); s.getRange('A14').values=[['兵種欄は自由入力可能。空欄はサイトに表示しません。']];
    s.mergeCells('A15:C15'); s.getRange('A15').values=[['枠を増やす場合は、同じ区分の行をコピーして挿入してください。']];
    s.getRange('A14:C15').format.font={size:10,color:'#526575'};
    s.freezePanes.freezeRows(5);
  }
  workbook.recalculate();
  return source.characters.map(c=>c.name);
}

