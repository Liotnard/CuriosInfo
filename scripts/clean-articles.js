const fs = require('fs');
const path = require('path');
const p = path.resolve(__dirname, '..', 'CuriosInfo DB', 'articles.json');
console.log('Cleaning', p);
const raw = fs.readFileSync(p, 'utf8');
let arr = JSON.parse(raw);
arr = arr.map(a => {
  const copy = { ...a };
  delete copy.actorName;
  delete copy.actorType;
  return copy;
});
fs.writeFileSync(p, JSON.stringify(arr, null, 2), 'utf8');
console.log('Done. Wrote', arr.length, 'articles');
