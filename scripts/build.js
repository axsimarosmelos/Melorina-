const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="src/styles.css">',()=>'<style>'+fs.readFileSync(path.join(root,'src/styles.css'),'utf8')+'</style>');
for(const name of ['content','engine','practice','voice-core','voice-client','voice-ui','app'])html=html.replace('<script src="src/'+name+'.js"></script>',()=>'<script>'+fs.readFileSync(path.join(root,'src/'+name+'.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/melorina.html'),html);
console.log('Built dist/melorina.html — standalone, no dependencies.');
