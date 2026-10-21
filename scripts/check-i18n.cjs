// Checks literal UI translation calls without shipping private configurations.
const fs=require('fs'),ts=require('typescript'),path=require('path');
const keys=new Set();
for(const file of ['src/i18n.ts','src/legacy-zh.ts','src/picture/zh.ts']){
 const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const visit=n=>{if(ts.isPropertyAssignment(n)&&ts.isStringLiteral(n.name))keys.add(n.name.text);ts.forEachChild(n,visit)};visit(sf);
}
const missing=[];
function scan(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,ent.name);if(ent.isDirectory())scan(file);else if(/\.tsx?$/.test(file)&&!file.endsWith('.test.ts')){
 const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const check=key=>{if(/[A-Za-z]/.test(key)&&!keys.has(key))missing.push({file,key});};
 const visit=n=>{if(ts.isCallExpression(n)&&['t','button','field'].includes(n.expression.getText(sf))&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0]))check(n.arguments[0].text);if(ts.isJsxAttribute(n)&&n.name.text==='label'&&n.initializer&&ts.isStringLiteral(n.initializer))check(n.initializer.text);ts.forEachChild(n,visit)};visit(sf);
}}}
scan('src');if(missing.length){console.error(JSON.stringify(missing,null,2));process.exitCode=1;}else console.log(`Translation coverage passed (${keys.size} dictionary keys).`);
