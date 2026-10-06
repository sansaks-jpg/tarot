// Controller/template smoke checks with a small DOM adapter; not browser QA.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as deck from '../public/deck.js';
import * as engine from '../public/engine.js';
function node(){const classes=new Set();return {innerHTML:'',textContent:'',hidden:false,disabled:false,dataset:{},attributes:{},style:{},classList:{add(c){classes.add(c);},contains(c){return classes.has(c);},toggle(c,on){on?classes.add(c):classes.delete(c);}},setAttribute(key,value){this.attributes[key]=value;},insertAdjacentHTML(_position,text){this.innerHTML+=text;},focus(){},close(){}};}
const nodes=new Map();const byId=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};let cards=[];
const controls={'[data-action="shuffle"]':node(),'[data-action="reset-picks"]':node(),'[data-action="start-reading"]':node()};
const doc={getElementById:byId,body:{dataset:{}},querySelector(selector){return selector==='.pick-card:not(:disabled)'?cards.find(c=>!c.disabled):controls[selector]||null;},querySelectorAll(selector){return selector==='.pick-card'?cards:[];}};
byId('main').innerHTML='<h1>Game lobby</h1>';
const context=vm.createContext({...deck,...engine,esc:engine.escapeHTML,document:doc,location:{hash:''},matchMedia:()=>({matches:true}),sfx(){},audioEnabled:()=>false,console,setTimeout,clearTimeout});
const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
vm.runInContext(source.slice(0,source.indexOf("\ndocument.addEventListener('submit'")).replace(/^import .*;\n/gm,''),context);
assert.match(vm.runInContext('setup()',context),/topic-tile/);assert.match(vm.runInContext('setup()',context),/spread-preview triple/);
vm.runInContext("state.reading=newReading('umum','Uji antarmuka',3)",context);const r=vm.runInContext('state.reading',context);
cards=r.candidates.map(id=>{const c=node();c.dataset.id=id;return c;});
assert.equal((vm.runInContext('pick()',context).match(/class="pick-card /g)||[]).length,7);
for(let i=0;i<3;i++){assert.equal(engine.chooseCard(r,cards[i].dataset.id),true);context.currentButton=cards[i];vm.runInContext('updatePickUI(currentButton)',context);assert.equal(controls['[data-action="start-reading"]'].disabled,i<2);assert.equal(byId('selectionCount').textContent,`${i+1} / 3 DIPILIH`);}
assert.ok(cards.every(c=>c.disabled));assert.equal(controls['[data-action="reset-picks"]'].hidden,false);
const tabs=Array.from({length:3},(_,i)=>{const t=node();t.dataset.tab=['makna','gambar','langkah'][i];return t;});
const panels=tabs.map(t=>{const p=node();p.dataset.panel=t.dataset.tab;return p;});
const group={querySelectorAll(selector){return selector==='[role="tab"]'?tabs:panels;}};tabs.forEach(t=>t.closest=()=>group);context.tabButton=tabs[1];vm.runInContext('activateMeaningTab(tabButton)',context);
assert.equal(tabs[1].attributes['aria-selected'],'true');assert.equal(tabs[0].attributes['aria-selected'],'false');assert.equal(tabs[1].tabIndex,0);assert.equal(tabs[0].tabIndex,-1);assert.equal(panels[1].hidden,false);assert.equal(panels[0].hidden,true);assert.equal(panels[2].hidden,true);
const opened=vm.runInContext('explanation(BY_ID[state.reading.selected[0]],{r:state.reading,index:0})',context);assert.equal((opened.match(/role="tab"/g)||[]).length,3);assert.equal((opened.match(/role="tabpanel"/g)||[]).length,3);assert.match(opened,/reader-/);
const modal=vm.runInContext('explanation(BY_ID[state.reading.selected[0]])',context);assert.match(modal,/modal-/);
context.location.hash='#ringkasan';vm.runInContext('render({focus:false})',context);assert.equal(vm.runInContext('state.route',context),'baca');assert.match(byId('main').innerHTML,/flipCard/);
for(let i=0;i<3;i++){r.current=i;engine.revealCard(r);}vm.runInContext('render({focus:false})',context);assert.equal(vm.runInContext('state.route',context),'ringkasan');assert.match(byId('main').innerHTML,/finish-banner/);assert.match(byId('main').innerHTML,/readingNotes/);
console.log('PASS: game-mode templates, 7-card table, selection controls, tab ARIA/visibility, unique dialog/reader IDs, and guarded completion views.');
