import {DECK,BY_ID,TOPICS} from './deck.js';

export const STORAGE_KEY='sela-notes-v1';
export function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function randomBelow(n,cryptoSource=globalThis.crypto){
 if(!Number.isSafeInteger(n)||n<1)throw new Error('Invalid random range');
 if(!cryptoSource?.getRandomValues)throw new Error('Peramban ini belum mendukung pengocokan kartu. Coba peramban yang lebih baru.');
 const limit=Math.floor(4294967296/n)*n, buffer=new Uint32Array(1);
 do{cryptoSource.getRandomValues(buffer);}while(buffer[0]>=limit);
 return buffer[0]%n;
}
export function shuffledCards(){
 const list=DECK.map(c=>c.id);
 for(let i=list.length-1;i>0;i--){const j=randomBelow(i+1);[list[i],list[j]]=[list[j],list[i]];}
 return list;
}
export function newReading(topic='umum',question='',count=1){
 if(!TOPICS[topic])throw new Error('Unknown topic');
 if(count!==1&&count!==3)throw new Error('Unknown spread');
 return {topic,question:String(question).trim().slice(0,280)||TOPICS[topic].question,count,candidates:shuffledCards().slice(0,7),selected:[],revealed:[],current:0,notes:'',createdAt:new Date().toISOString()};
}
export function chooseCard(reading,id){
 if(!reading.candidates.includes(id)||reading.selected.includes(id)||reading.selected.length>=reading.count)return false;
 reading.selected.push(id);return true;
}
export function revealCard(reading){
 if(reading.selected.length!==reading.count)return false;
 const id=reading.selected[reading.current];if(!BY_ID[id])return false;
 if(!reading.revealed.includes(id))reading.revealed.push(id);return true;
}
export function readingComplete(reading){return !!reading&&reading.selected.length===reading.count&&reading.revealed.length===reading.count;}
export function validateNote(item){
 return item&&typeof item.id==='string'&&typeof item.question==='string'&&item.question.length<=280&&Array.isArray(item.cards)&&(item.cards.length===1||item.cards.length===3)&&new Set(item.cards).size===item.cards.length&&item.cards.every(id=>BY_ID[id])&&!!TOPICS[item.topic]&&typeof item.notes==='string'&&item.notes.length<=3000&&Number.isFinite(Date.parse(item.createdAt));
}
export function loadNotes(storage){
 try{const items=JSON.parse(storage.getItem(STORAGE_KEY)||'[]');return Array.isArray(items)?items.filter(validateNote).slice(0,50):[];}catch{return [];}
}
export function saveNote(storage,reading,id){
 if(!readingComplete(reading))throw new Error('Buka semua kartu sebelum menyimpan.');
 const note={id,topic:reading.topic,question:reading.question,cards:[...reading.selected],notes:reading.notes.slice(0,3000),createdAt:reading.createdAt};
 if(!validateNote(note))throw new Error('Catatan tidak dapat disimpan.');
 const items=loadNotes(storage),position=items.findIndex(n=>n.id===id);
 if(position>=0)items[position]=note;else items.unshift(note);
 storage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,50)));return note;
}
export function noteToText(note){
 return `SELA — CATATAN TAROT\n${new Date(note.createdAt).toLocaleString('id-ID')}\n\nPertanyaan: ${note.question}\nTopik: ${TOPICS[note.topic].label}\n\n${note.cards.map((id,i)=>{const c=BY_ID[id];return `${i+1}. ${c.name} — ${c.indo}\n${c.keywords}\n${c.meaning}\nLangkah yang bisa dicoba: ${c.action}\nPertanyaan refleksi: ${c.prompt}`;}).join('\n\n')}\n\nCATATAN PRIBADI\n${note.notes||'Belum ada catatan.'}\n\nKartu dipilih secara acak. Makna adalah bahan refleksi, bukan kepastian masa depan.\n`;
}
