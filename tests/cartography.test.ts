import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeActorType,actorCategory,ACTOR_AXES,floatingLabelPosition} from '../shared/actors';
import {normalizeActor} from '../tools/normalize';

test('independent aliases use the same plural category in publication, legend and lists',()=>{
 for(const value of ['independants','independant','indépendant','indépendants']){
  assert.equal(normalizeActorType(value),'independants');assert.equal(actorCategory(value).color,'hsl(300, 80%, 50%)');
  assert.equal(normalizeActor({id:1,actor_type:value}).actor_type,'independants');
 }
 assert.equal(normalizeActorType('personnalités'),'personnalite');assert.equal(normalizeActorType('influenceurs'),'influenceur');
});
test('progressive-negative and conservative-positive have a shared direction without rewriting scores',()=>{
 const axis=ACTOR_AXES.find(a=>a.key==='progCons')!;assert.equal(axis.short,'Prog-Cons');assert.equal(axis.low,'Progressiste');assert.equal(axis.high,'Conservateur');
 assert.equal(normalizeActor({id:1,prog_cons:-8.2}).progCons,-8.2);assert.equal(normalizeActor({id:2,prog_cons:7.2}).progCons,7.2);
});
test('floating labels switch sides and stay inside chart edges on narrow layouts',()=>{
 for(const [x,y] of [[18,20],[265,335],[140,180]]){
  const p=floatingLabelPosition(x,y,290,360,208,76);assert.ok(p.left>=6&&p.left+208<=284);assert.ok(p.top>=6&&p.top+76<=354);
  assert.equal(p.side,x>145?'left':'right');
 }
});
