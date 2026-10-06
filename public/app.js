import {DECK,BY_ID,SUITS,TOPICS,POSITIONS} from './deck.js';
import {escapeHTML as esc,newReading,chooseCard,revealCard,readingComplete,shuffledCards,loadNotes,saveNote,STORAGE_KEY,noteToText} from './engine.js';
import {toggleAudio,audioEnabled,setVolume,sfx} from './audio.js';

const main=document.getElementById('main');
const HOME=main.innerHTML;
const modal=document.getElementById('modal');
const state={reading:null,form:{topic:'umum',question:'',count:1},route:'beranda',filter:'all',search:'',noteId:null,toastTimer:null,shuffleBusy:false};
const arrow='<span aria-hidden="true">→</span>';
const topicIcons={umum:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',hubungan:'<path d="M12 20S2 14 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 6-10 12-10 12z"/>',kerja:'<path d="M12 5v16M12 6C8 3 4 4 2 5v15c4-2 7-1 10 1 3-2 6-3 10-1V5c-2-1-6-2-10 1z"/>',diri:'<circle cx="12" cy="12" r="9"/><path d="M8 10v1m8-1v1M8 15q4 4 8 0"/>'};
const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${topicIcons[name]}</svg>`;
const art=(id,extra='')=>`<img src="/assets/cards/${id}.svg" width="280" height="460" alt="${esc(BY_ID[id]?.name||'Dos kartu Sela')}" ${extra}>`;
const positions=r=>r.count===3?POSITIONS:[{name:'Satu kartu',label:'Satu sudut pandang',description:'Baca sebagai satu tema yang bisa kamu hubungkan dengan pertanyaanmu.'}];
const currentNote=()=>({id:state.noteId||'unsaved',topic:state.reading.topic,question:state.reading.question,cards:state.reading.selected,notes:state.reading.notes,createdAt:state.reading.createdAt});
function toast(message){const node=document.getElementById('toast');clearTimeout(state.toastTimer);node.textContent=message;node.classList.add('visible');state.toastTimer=setTimeout(()=>node.classList.remove('visible'),4200);}
function burstAt(element,kind='select'){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||!element)return;
 const rect=element.getBoundingClientRect(),burst=document.createElement('span'),colors=['#ff7fab','#ffc85e','#63dbc5','#a68bfa','#6db7fa'];
 burst.className='spark-burst';burst.setAttribute('aria-hidden','true');burst.style.left=`${rect.left+rect.width/2}px`;burst.style.top=`${rect.top+rect.height*.45}px`;
 const count=kind==='select'?8:20;
 for(let i=0;i<count;i++){const particle=document.createElement('i'),angle=i/count*Math.PI*2,radius=(kind==='select'?55:130)+(i%3)*15;particle.style.setProperty('--dx',`${Math.cos(angle)*radius}px`);particle.style.setProperty('--dy',`${Math.sin(angle)*radius-35}px`);particle.style.setProperty('--rot',`${i*47}deg`);particle.style.setProperty('--color',colors[i%colors.length]);burst.append(particle);}
 document.body.append(burst);setTimeout(()=>burst.remove(),1050);
}
function activateMeaningTab(button){
 const group=button.closest('.card-explanation');if(!group)return;
 group.querySelectorAll('[role="tab"]').forEach(tab=>{const selected=tab===button;tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
 group.querySelectorAll('[role="tabpanel"]').forEach(panel=>panel.hidden=panel.dataset.panel!==button.dataset.tab);
}
function updatePickUI(button){
 const r=state.reading,ready=r.selected.length===r.count,n=r.selected.indexOf(button.dataset.id),pos=positions(r);
 button.classList.add('selected');button.disabled=true;button.setAttribute('aria-pressed','true');button.setAttribute('aria-label',`Terpilih sebagai kartu ke-${n+1}`);button.insertAdjacentHTML('beforeend',`<span class="pick-order">${n+1}</span>`);
 document.getElementById('selectionCount').textContent=`${r.selected.length} / ${r.count} DIPILIH`;
 document.getElementById('pickIntro').innerHTML=`<p>${ready?'Sip! Kartu pilihanmu siap dibuka.':`Kartu ke-${r.selected.length+1} untuk <strong>${pos[r.selected.length].name.toLowerCase()}</strong>.`}</p>`;
 document.getElementById('selectionSlots').innerHTML=pos.map((p,i)=>`<span class="position-tag ${r.selected[i]?'filled':''}">${r.selected[i]?'✓':'?'} ${p.name}</span>`).join('');
 document.querySelector('[data-action="shuffle"]').disabled=true;document.querySelector('[data-action="reset-picks"]').hidden=false;document.querySelector('[data-action="start-reading"]').disabled=!ready;
 if(ready)document.querySelectorAll('.pick-card').forEach(card=>card.disabled=true);
 burstAt(button);document.querySelector(ready?'[data-action="start-reading"]':'.pick-card:not(:disabled)')?.focus({preventScroll:true});
}
function steps(active){return `<div class="game-progress"><div class="progress-caption"><span>BACAANMU</span><span>TAHAP ${active+1} / 4</span></div><ol class="steps" aria-label="Tahapan bacaan">${['Siapkan','Pilih','Buka','Simpan'].map((label,i)=>`<li class="${i===active?'active':i<active?'done':''}" ${i===active?'aria-current="step"':''}><b>${i<active?'✓':i+1}</b><span>${label}</span></li>`).join('')}</ol><div class="progress-track" aria-hidden="true"><span style="width:${(active+1)*25}%"></span></div></div>`;}
function heading(kicker,title,description=''){return `<div class="page-heading"><p class="eyebrow">${kicker}</p><h1 tabindex="-1">${title}</h1>${description?`<p class="description">${description}</p>`:''}</div>`;}
function ribbon(r){return `<div class="question-ribbon"><span>PERTANYAANMU</span><p>“${esc(r.question)}”</p></div>`;}
function page(content){return `<section class="page wrap">${content}</section>`;}
function back(action,label='Kembali'){return `<button class="back-link" type="button" data-action="${action}"><span aria-hidden="true">←</span> ${label}</button>`;}
function setHash(hash){if(location.hash===`#${hash}`){render();}else location.hash=hash;}
function focusHeading(){requestAnimationFrame(()=>{main.querySelector('h1')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});}
function activeNav(route){document.querySelectorAll('[data-nav]').forEach(link=>{const selected=link.dataset.nav===(route==='baca'||route==='ringkasan'||route==='pilih'?'bacaan':route);if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});}

function setup(){
 const f=state.form;
 return page(`${back('home','Lobby')}${steps(0)}${heading('AYO MULAI','Mau bahas apa?','Pilih topik dan mode main. Pertanyaanmu boleh simpel.')}
 <div class="setup-layout"><form class="setup-form" id="setupForm">
 <fieldset><legend>1. Pilih topik</legend><div class="topics">${Object.entries(TOPICS).map(([key,topic])=>`<label class="topic-tile" data-topic="${key}"><input type="radio" name="topic" value="${key}" ${f.topic===key?'checked':''}><span class="topic-icon">${icon(key)}</span><span>${topic.label}</span><span class="tile-check" aria-hidden="true">✓</span></label>`).join('')}</div></fieldset>
 <label class="input-label" for="question">2. Apa yang lagi kamu pikirkan? <span class="label-optional">boleh kosong</span></label>
 <textarea id="question" class="question-input" name="question" maxlength="280" placeholder="Misalnya: Apa yang bisa aku coba biar lebih siap?" aria-describedby="questionHelp questionCounter">${esc(f.question)}</textarea>
 <div class="field-meta"><span id="questionHelp">Kosong? Pakai pertanyaan contoh di bawah.</span><span id="questionCounter">${f.question.length}/280</span></div>
 <div class="example-question"><button type="button" data-action="example" id="exampleQuestion">${TOPICS[f.topic].question} <span aria-hidden="true">＋</span></button></div>
 <fieldset><legend>3. Pilih mode main</legend><div class="spread-options"><label class="spread-option"><input type="radio" name="count" value="1" ${f.count===1?'checked':''}><div class="spread-preview single" aria-hidden="true"><span></span></div><strong>Satu kartu</strong><span>Ringkas. Satu tema untuk kamu pahami.</span><small>COCOK UNTUK PERTAMA KALI</small></label><label class="spread-option"><input type="radio" name="count" value="3" ${f.count===3?'checked':''}><div class="spread-preview triple" aria-hidden="true"><span></span><span></span><span></span></div><strong>Tiga kartu</strong><span>Situasi, sudut pandang, lalu langkah kecil.</span><small>BUKA SATU PER SATU</small></label></div></fieldset>
 <div class="form-actions"><button type="submit" class="button primary">Ke meja kartu ${arrow}</button></div><p class="microcopy" style="margin-top:16px">Pertanyaanmu tetap di perangkat ini.</p>
 </form><aside class="setup-note"><span class="helper-face" aria-hidden="true">${icon('umum')}</span><h2>Belum pernah baca tarot?</h2><p>Tenang, tiap kartu ada penjelasannya. Kamu cukup pilih kartu dan lihat bagian mana yang cocok dengan pengalamanmu.</p><a href="#panduan" class="button secondary">Lihat cara main ${arrow}</a></aside></div>`);
}

function pick(){
 const r=state.reading,pos=positions(r),ready=r.selected.length===r.count;
 return page(`${back('edit','Ubah pertanyaan')}${steps(1)}${heading('MEJA KARTU',r.count===1?'Pilih kartumu!':'Pilih tiga kartumu!','Ketuk yang kamu suka. Tidak perlu menebak kartunya.')}${ribbon(r)}
 <div class="pick-table"><div class="table-hud"><span class="table-label">DEK SUDAH DIKOCOK</span><strong id="selectionCount" role="status">${r.selected.length} / ${r.count} DIPILIH</strong></div>
 <div class="pick-intro" id="pickIntro"><p>${ready?'Sip! Kartu pilihanmu siap dibuka.':r.count===1?'Pilih satu kartu di meja.':`Kartu ke-${r.selected.length+1} untuk <strong>${pos[r.selected.length].name.toLowerCase()}</strong>.`}</p></div>
 <div class="pick-grid" id="pickGrid">${r.candidates.map((id,i)=>{const n=r.selected.indexOf(id);return `<button type="button" class="pick-card ${n>=0?'selected':''}" style="--i:${i};--tilt:${[ -7,3,-3,6,-5,4,-2][i]}deg" data-action="pick" data-id="${id}" ${ready||n>=0?'disabled':''} aria-label="${n>=0?`Terpilih sebagai kartu ke-${n+1}`:`Pilih kartu tertutup nomor ${i+1}`}" aria-pressed="${n>=0}"><img src="/assets/cards/back.svg" width="280" height="460" alt="">${n>=0?`<span class="pick-order">${n+1}</span>`:''}</button>`;}).join('')}</div>
 <div class="selection-status" id="selectionSlots">${pos.map((p,i)=>`<span class="position-tag ${r.selected[i]?'filled':''}">${r.selected[i]?'✓':'?'} ${p.name}</span>`).join('')}</div>
 <div class="pick-actions" style="margin-top:24px"><button class="shuffle-button" data-action="shuffle" ${r.selected.length?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3c5 0 6 10 11 10h4m-4-3 3 3-3 3M3 17h3c5 0 6-10 11-10h4m-4-3 3 3-3 3"/></svg>Kocok lagi</button><button class="quiet-link pick-reset" data-action="reset-picks" ${r.selected.length&&!r.revealed.length?'':'hidden'}>Pilih ulang</button><button class="button primary" data-action="start-reading" ${ready?'':'disabled'}>${r.count===1?'Buka kartuku':'Buka kartu pertama'} ${arrow}</button></div></div>
 <p class="small-help">Tiap kartu dipilih secara acak dari 78 kartu. Semua dibaca tegak supaya mudah diikuti.</p>`);
}

function explanation(card,{r=null,index=0}={}){
 const scope=r?'reader':'modal',key=`${scope}-${card.id}`;
 return `<div class="revealed-content card-explanation"><span class="card-unlocked">KARTU TERBUKA</span><h2 tabindex="-1">${card.name}</h2><p class="card-indoname">${card.indo} · ${SUITS[card.suit].name}</p><p class="card-keywords">${card.keywords}</p>
 <div class="meaning-tabs" role="tablist" aria-label="Penjelasan kartu">${[['makna','Maknanya'],['gambar','Gambarnya'],['langkah','Coba ini']].map(([id,label],i)=>`<button type="button" role="tab" id="${key}-tab-${id}" class="meaning-tab ${i===0?'active':''}" data-action="meaning-tab" data-tab="${id}" aria-controls="${key}-panel-${id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${label}</button>`).join('')}</div>
 <section class="meaning-panel" role="tabpanel" id="${key}-panel-makna" data-panel="makna" aria-labelledby="${key}-tab-makna"><p class="meaning-text">${esc(card.meaning)}</p>${r?`<p class="position-message"><strong>${positions(r)[index].name}:</strong> ${positions(r)[index].description}</p>`:''}<div class="reflection-box"><p class="eyebrow">COBA PIKIRKAN</p><p>${esc(card.prompt)}</p></div></section>
 <section class="meaning-panel" role="tabpanel" id="${key}-panel-gambar" data-panel="gambar" aria-labelledby="${key}-tab-gambar" hidden><h3>Simbol di kartumu</h3><ul class="symbol-list">${card.symbols.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p class="topic-lens">Lihat gambarnya lagi. Simbol mana yang paling menarik perhatianmu?</p></section>
 <section class="meaning-panel" role="tabpanel" id="${key}-panel-langkah" data-panel="langkah" aria-labelledby="${key}-tab-langkah" hidden><h3>Satu langkah kecil</h3><div class="action-card">${esc(card.action)}</div>${r?`<p class="topic-lens">${TOPICS[r.topic].lens}</p>`:''}<p class="topic-lens">Tidak harus dilakukan semuanya. Pilih yang sesuai dengan keadaanmu.</p></section></div>`;
}

function reader(){
 const r=state.reading,index=r.current,id=r.selected[index],card=BY_ID[id],opened=r.revealed.includes(id),pos=positions(r)[index];
 return page(`${back('return-pick','Lihat pilihan kartu')}${steps(2)}${heading(`KARTU ${index+1} / ${r.count}`,opened?'Kenali kartumu.':'Siap membukanya?',pos.label)}${ribbon(r)}
 <div class="reader-layout"><div class="reader-card-side"><p class="reading-position">${pos.name}</p><button type="button" class="flip-card ${opened?'is-open':''}" id="flipCard" data-action="reveal" ${opened?'disabled':''} aria-label="${opened?`Kartu ${esc(card.name)} sudah terbuka`:'Buka kartu ini'}"><span class="flip-inner"><img class="flip-face flip-back" src="/assets/cards/back.svg" width="280" height="460" alt=""><img class="flip-face flip-front" src="/assets/cards/${id}.svg" width="280" height="460" alt="${opened?esc(card.name):''}" ${opened?'':'aria-hidden="true"'}></span></button><p class="card-tap-hint">${opened?'Terbuka! Yuk, lihat maknanya.':'Ketuk untuk membuka!'}</p></div>
 <div class="reader-content" id="readerContent">${opened?explanation(card,{r,index}):`<div class="reveal-prompt"><span class="reveal-bubble">Kartumu sudah siap!</span><h2>Ketuk. Buka.<br>Kenali ceritanya.</h2><p>Setelah kartunya terbuka, pilih tab untuk membaca makna, melihat simbol, dan mencoba satu langkah kecil.</p><button class="button primary" data-action="reveal">Buka kartu! <span aria-hidden="true">↗</span></button><p class="microcopy">${audioEnabled()?'Suara aktif. Efek lembut akan terdengar saat kartu terbuka.':'Untuk backsound & SFX, nyalakan tombol suara di atas.'}</p></div>`}
 <div class="reader-navigation" id="readerNav">${r.count===3?`<div class="reader-pager" aria-label="Pindah kartu">${r.selected.map((cid,i)=>`<button data-action="reader-index" data-index="${i}" class="${i===index?'current':''}" ${i>index&&!r.revealed.includes(cid)?'disabled':''} aria-label="Kartu ${i+1}: ${r.revealed.includes(cid)?esc(BY_ID[cid].name):'belum dibuka'}" ${i===index?'aria-current="step"':''}>${i+1}</button>`).join('')}</div>`:''}<button class="button primary" data-action="next" ${opened?'':'disabled'}>${index===r.count-1?'Selesaikan bacaan':'Kartu selanjutnya'} ${arrow}</button></div></div></div>`);
}

function summary(){
 const r=state.reading;
 return page(`${back('return-reader','Kembali ke makna kartu')}${steps(3)}<div class="finish-banner"><span class="finish-medal" aria-hidden="true">✓</span><span>SEMUA KARTU TERBUKA!</span></div>${heading('BACAAN SELESAI','Apa yang kamu temukan?','Pilih satu hal yang menarik, lalu simpan untuk dibaca lagi.')}${ribbon(r)}
 <div class="summary-grid ${r.count===1?'one-card':''}">${r.selected.map((id,i)=>{const c=BY_ID[id];return `<article class="summary-card">${art(id)}<div><p class="eyebrow">${i+1} / ${positions(r)[i].name}</p><h2>${c.name}</h2><p>${c.keywords}</p><p>${esc(c.action)}</p><button data-action="card-detail" data-id="${id}">Baca maknanya lagi ${arrow}</button></div></article>`;}).join('')}</div>
 <div class="note-field"><h2>Satu catatan untuk dirimu.</h2><p>Misalnya, hal yang terasa sesuai atau langkah yang ingin kamu coba setelah bacaan ini.</p><label class="input-label" for="readingNotes">Catatan pribadi <span class="label-optional">opsional</span></label><textarea id="readingNotes" class="notes-input" maxlength="3000" placeholder="Dari bacaan ini, aku ingin memperhatikan…">${esc(r.notes)}</textarea><div class="field-meta"><span>Disimpan hanya di peramban ini setelah kamu menekan Simpan.</span><span id="notesCounter">${r.notes.length}/3000</span></div>
 <div class="summary-actions"><button class="button primary" data-action="save">Simpan catatan <span aria-hidden="true">↗</span></button><button class="button secondary" data-action="download-reading">Unduh bacaan <span aria-hidden="true">↓</span></button></div><p class="note-confirmation" id="saveStatus" role="status">${state.noteId?'Catatan pernah disimpan. Tekan Simpan lagi untuk menyimpan perubahan.':''}</p><p class="microcopy">Catatan tidak berpindah ke perangkat lain. Unduh salinannya jika ingin menyimpannya lebih lama.</p><button class="restart-link" data-action="new">Mulai bacaan baru ${arrow}</button></div>`);
}

function library(){
 return page(`${back('home','Lobby')}${heading('78 KARTU, SEMUA BISA DIBUKA','Koleksi kartu.','Ketuk kartu untuk mengenali gambar dan maknanya. Cari nama atau tema yang kamu penasaran.')}
 <div class="library-toolbar"><label class="search-wrap"><span class="sr-only">Cari nama atau makna kartu</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input type="search" id="cardSearch" class="search-input" placeholder="Cari nama atau tema kartu…" value="${esc(state.search)}" aria-label="Cari kartu"></label><div class="library-filters" aria-label="Kelompok kartu">${[['all','Semua'],...Object.entries(SUITS).map(([id,s])=>[id,s.name])].map(([id,name])=>`<button class="chip ${state.filter===id?'active':''}" data-action="filter" data-filter="${id}" aria-pressed="${state.filter===id}">${name}</button>`).join('')}</div></div><p class="library-count" id="libraryCount" role="status"></p><div class="library-grid" id="libraryGrid"></div>`);
}
function fillLibrary(){
 const grid=document.getElementById('libraryGrid');if(!grid)return;
 const query=state.search.toLocaleLowerCase('id-ID').trim(),cards=DECK.filter(c=>(state.filter==='all'||c.suit===state.filter)&&`${c.name} ${c.indo} ${c.keywords} ${c.meaning}`.toLocaleLowerCase('id-ID').includes(query));
 document.getElementById('libraryCount').textContent=`${cards.length} dari 78 kartu${state.filter!=='all'?` · ${SUITS[state.filter].description}`:''}`;
 grid.innerHTML=cards.length?cards.map(c=>`<button class="library-card" data-action="card-detail" data-id="${c.id}" aria-label="Pelajari ${c.name}, ${c.indo}">${art(c.id,'loading="lazy" decoding="async"')}<h2>${c.name}</h2><p>${c.indo}</p><p class="card-family">${SUITS[c.suit].short}</p></button>`).join(''):'<p class="empty-hint" style="grid-column:1/-1">Belum ada kartu yang cocok. Coba kata seperti “perubahan”, “hubungan”, atau “bulan”.</p>';
}

function guide(){
 const faqs=[['Apakah tarot bisa memastikan masa depan?','Sela tidak menggunakan kartu untuk memberikan kepastian masa depan. Kartu dipilih secara acak, lalu maknanya disajikan sebagai bahan refleksi. Makna yang terasa cocok bukan bukti bahwa kartu mengetahui situasimu.'],['Kenapa semua kartu di sini tegak?','Dalam beberapa cara membaca, kartu terbalik memiliki penafsiran tambahan. Sela memakai posisi tegak agar pemula bisa memahami satu makna dasar terlebih dahulu. Kartu tegak pun dapat membahas tantangan atau hal yang perlu diperhatikan.'],['Apakah Death, The Devil, dan The Tower berarti sesuatu yang buruk akan terjadi?','Tidak. Death biasanya dibaca sebagai peralihan; The Devil sebagai keterikatan; The Tower sebagai perubahan atau asumsi yang perlu ditinjau. Nama dan gambar dramatisnya bukan ramalan tentang bahaya yang akan terjadi.'],['Kenapa kartu yang sama bisa muncul lagi?','Setiap bacaan dimulai dengan satu dek berisi 78 kartu yang dikocok kembali. Tidak ada kartu ganda dalam satu bacaan, tetapi kartu yang sama boleh muncul di bacaan berikutnya. Itu bagian dari pemilihan acak.'],['Apakah pertanyaan dan catatanku bisa dilihat orang lain?','Pertanyaan dan bacaan dibuat di perambanmu. Catatan hanya ditulis ke penyimpanan lokal ketika kamu memilih Simpan, tanpa dikirim ke server Sela. Orang yang menggunakan profil peramban yang sama mungkin dapat membuka catatan tersebut. Kamu bisa menghapus atau mengunduhnya.'],['Apa arti Page, Knight, Queen, dan King?','Ini empat kartu karakter dalam setiap kelompok: pemula, ksatria, ratu, dan raja. Di Sela, kartu ini dibaca sebagai cara bersikap, seperti ingin belajar atau membuat keputusan. Tidak perlu menganggapnya menunjuk orang dengan usia atau jenis kelamin tertentu.']];
 return page(`${back('home','Lobby')}${heading('TUTORIAL','Cara main tarot.','Empat tahap singkat. Kamu tidak perlu hafal arti kartu.')}
 <div class="guide-layout"><section class="guide-chapter"><span class="number">01</span><div><h2>Mulai dengan pertanyaan terbuka.</h2><p>Gunakan pertanyaan tentang apa yang bisa kamu pahami, perhatikan, atau lakukan. Tidak perlu membuat pertanyaan tentang semua bagian hidup sekaligus.</p><div class="guide-example">“Apa yang bisa aku lakukan agar komunikasiku lebih baik?”</div><p>Jika belum punya pertanyaan, contoh sesuai topik akan dipakai untuk bacaanmu.</p></div></section>
 <section class="guide-chapter"><span class="number">02</span><div><h2>Kenali dua kelompok kartu.</h2><p><strong>Arcana Mayor</strong> berisi 22 kartu tentang tema besar, seperti perubahan dan pilihan. <strong>Arcana Minor</strong> berisi 56 kartu tentang pengalaman sehari-hari, dalam empat kelompok.</p><div class="suit-guide">${Object.entries(SUITS).filter(([key])=>key!=='major').map(([key,s])=>`<div><h3>${s.name} / ${s.english}</h3><p>${s.description}</p></div>`).join('')}</div></div></section>
 <section class="guide-chapter"><span class="number">03</span><div><h2>Baca sesuai peran kartu.</h2><p>Dalam bacaan satu kartu, kartu menjadi satu tema untuk direnungkan. Dalam bacaan tiga kartu, urutan pilihan memberi setiap kartu peran yang berbeda.</p><div class="suit-guide">${POSITIONS.map((p,i)=>`<div><h3>${i+1}. ${p.name}</h3><p>${p.description}</p></div>`).join('')}</div></div></section>
 <section class="guide-chapter"><span class="number">04</span><div><h2>Ambil satu hal yang berguna.</h2><p>Penjelasan akan menunjukkan makna dasar, simbol, dan contoh tindakan. Hubungkan dengan pengalaman yang kamu ketahui, bukan dengan asumsi tentang orang lain.</p><p>Jika dua kartu terlihat berbeda, kamu bisa memperlakukannya sebagai dua sisi persoalan. Jika tidak ada yang terasa cocok, kamu boleh melewatinya.</p><div class="guide-example">“Bagian ini cocok dengan pengalamanku karena…”</div></div></section></div>
 <section class="guide-faq"><h2>Yang sering ditanyakan.</h2>${faqs.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section><div class="form-actions"><a href="#bacaan" class="button primary">Mulai bacaan pertama ${arrow}</a><a href="#kartu" class="quiet-link">Lihat kamus kartu ${arrow}</a></div>`);
}

function getSaved(){try{return loadNotes(localStorage);}catch{return [];}}
function date(value){return new Date(value).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});}
function notes(){
 const items=getSaved();
 return page(`${back('home','Lobby')}${heading('JURNALMU','Bacaan yang disimpan.','Lihat lagi kartumu dan catatan yang kamu tulis. Semuanya tersimpan di peramban ini.')}
 ${items.length?`<div class="history-list">${items.map(n=>`<article class="history-card">${art(n.cards[0],'loading="lazy"')}<div><time datetime="${esc(n.createdAt)}">${date(n.createdAt)} · ${TOPICS[n.topic].label}</time><h2>“${esc(n.question)}”</h2><p>${n.cards.map(id=>BY_ID[id].name).join(' · ')}</p><div class="history-actions"><button data-action="note-open" data-note="${esc(n.id)}">Buka catatan ${arrow}</button><button data-action="note-download" data-note="${esc(n.id)}">Unduh ↓</button><button class="delete-note" data-action="note-delete" data-note="${esc(n.id)}">Hapus</button></div></div></article>`).join('')}</div><p class="microcopy" style="margin-top:20px">${items.length} bacaan tersimpan. Sela menyimpan paling banyak 50 bacaan terbaru di peramban ini.</p>`:
 `<div class="empty-state"><svg class="note-empty-icon" viewBox="0 0 40 40" aria-hidden="true"><path d="M9 5h24v30H9zM5 12h9M5 20h9M5 28h9M19 13h8M19 20h8M19 27h5"/></svg><h2>Masih ada halaman kosong.</h2><p>Setelah membaca kartu, kamu bisa menulis dan menyimpan satu hal yang ingin diingat.</p><a class="button primary" href="#bacaan">Mulai satu bacaan ${arrow}</a></div>`}<p class="divider-caption">Menghapus data peramban juga akan menghapus catatan di sini.</p>`);
}

function render({focus=true}={}){
 const hash=location.hash.slice(1)||'beranda',parts=hash.split('/');let route=parts[0];
 if(['pilih','baca','ringkasan'].includes(route)&&!state.reading)route='bacaan';
 if(['baca','ringkasan'].includes(route)&&state.reading.selected.length!==state.reading.count)route='pilih';
 if(route==='ringkasan'&&!readingComplete(state.reading))route='baca';
 if(!['beranda','bacaan','pilih','baca','ringkasan','kartu','panduan','catatan'].includes(route))route='beranda';
 state.route=route;document.body.dataset.screen=route;modal.close();
 main.innerHTML=route==='beranda'?HOME:route==='bacaan'?setup():route==='pilih'?pick():route==='baca'?reader():route==='ringkasan'?summary():route==='kartu'?library():route==='panduan'?guide():notes();
 activeNav(route);document.title=route==='beranda'?'Sela — Main tarot, kenali kartumu':`${({bacaan:'Mulai bacaan',pilih:'Pilih kartu',baca:'Pahami kartu',ringkasan:'Rangkuman bacaan',kartu:'Koleksi 78 kartu',panduan:'Cara main',catatan:'Jurnal'})[route]} — Sela`;
 if(route==='kartu'){fillLibrary();if(BY_ID[parts[1]])cardModal(parts[1]);}
 if(route==='beranda'&&state.reading){const resume=readingComplete(state.reading)?'ringkasan':state.reading.selected.length===state.reading.count?'baca':'pilih';document.getElementById('resumeReading').innerHTML=`<div class="resume-box"><span>Belum selesai?</span><a href="#${resume}">Lanjutkan ${arrow}</a></div>`;}
 if(focus&&!(route==='kartu'&&BY_ID[parts[1]]))focusHeading();
}

function openModal(title,content){
 document.getElementById('modalBody').innerHTML=`<div class="modal-header"><h2 id="modalTitle">${title}</h2><button class="modal-close" data-action="close" aria-label="Tutup jendela">×</button></div><div class="modal-content">${content}</div>`;
 if(!modal.open)modal.showModal();modal.scrollTop=0;modal.querySelector('.modal-close').focus();
}
function cardModal(id){const c=BY_ID[id];if(!c)return;openModal(`KAMUS KARTU / ${SUITS[c.suit].name.toUpperCase()}`,`<div class="modal-card-layout">${art(id,'class="modal-card-image"')}<div class="modal-card-copy">${explanation(c)}</div></div>`);}
function about(){openModal('TENTANG SELA',`<div class="about-body"><h3>Main kartu, kenali maknanya.</h3><p>Sela adalah panduan tarot untuk orang yang belum mengenal kartu. Makna ditulis dalam bahasa sehari-hari dan mengikuti tema umum tarot. Tafsir dapat berbeda antardek dan pembaca.</p><p>Kartu dikocok secara acak. Sela tidak menganalisis pertanyaan dengan AI dan tidak membuat prediksi pribadi. Pertanyaanmu menjadi konteks yang kamu gunakan sendiri untuk membaca makna.</p><h3>Pertanyaan & catatan.</h3><p>Pertanyaan, pilihan kartu, dan catatan diproses di peramban. Catatan ditulis ke penyimpanan lokal hanya ketika kamu menekan Simpan. Tidak ada akun, formulir email, iklan, atau pelacak analitik yang ditambahkan oleh Sela.</p><p>Catatan tidak disinkronkan. Jika orang lain menggunakan profil peramban yang sama, mereka bisa membuka catatan yang tersimpan. Gunakan Unduh untuk membuat salinan, atau Hapus untuk menghilangkan satu catatan.</p><h3>Ilustrasi & suara.</h3><p>78 ilustrasi vektor dibuat khusus untuk Sela. Musik bernuansa game, suara mengocok, dan bunyi membuka kartu dirangkai secara sintetis di peramban. Suara dimulai hanya setelah tombol suara dinyalakan, dan berhenti sementara saat tab tidak terlihat.</p><h3>Cara memandang sebuah bacaan.</h3><p>Makna yang terasa cocok bukan bukti bahwa kartu mengetahui situasi pribadi. Studi Forer membahas bagaimana deskripsi umum dapat terasa khusus bagi pembacanya. Sela memakai pertanyaan terbuka dan meminta pengguna menilai sendiri makna yang sesuai.</p><p>Tombol dibuat cukup lapang dan tahapan dijelaskan satu per satu. Penelitian Fitts tentang hubungan ukuran sasaran dan gerakan menjadi salah satu rujukan untuk pertimbangan interaksi ini; itu bukan hasil uji kegunaan khusus Sela.</p><ul><li>Forer, B. R. (1949). <em>The fallacy of personal validation: A classroom demonstration of gullibility.</em> The Journal of Abnormal and Social Psychology, 44(1), 118–123. <a href="https://doi.org/10.1037/h0059240" target="_blank" rel="noopener noreferrer">DOI: 10.1037/h0059240</a>.</li><li>Fitts, P. M. (1954). <em>The information capacity of the human motor system in controlling the amplitude of movement.</em> Journal of Experimental Psychology, 47(6), 381–391. <a href="https://doi.org/10.1037/h0055392" target="_blank" rel="noopener noreferrer">DOI: 10.1037/h0055392</a>.</li></ul></div>`);}
function download(note){
 const blob=new Blob([noteToText(note)],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`sela-bacaan-${note.createdAt.slice(0,10)}.txt`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Salinan bacaan diunduh.');
}
function findNote(id){return getSaved().find(n=>n.id===id);}
function noteModal(id){const n=findNote(id);if(!n){toast('Catatan tidak ditemukan.');return;}
 openModal(`CATATAN / ${date(n.createdAt).toUpperCase()}`,`<h3 style="font-size:28px;line-height:1.4">“${esc(n.question)}”</h3><p class="microcopy">${TOPICS[n.topic].label}</p><div class="note-mini-cards">${n.cards.map(cid=>`<button data-action="card-detail" data-id="${cid}" aria-label="Baca arti ${BY_ID[cid].name}">${art(cid)}<span>${BY_ID[cid].name}</span></button>`).join('')}</div><p class="eyebrow" style="margin-top:26px">CATATANMU</p><p class="saved-note-text">${esc(n.notes||'Belum ada catatan pribadi untuk bacaan ini.')}</p><button class="button secondary" data-action="note-download" data-note="${esc(n.id)}">Unduh bacaan ↓</button>`);
}
function deletePrompt(id){const n=findNote(id);if(!n)return;openModal('HAPUS SATU CATATAN',`<h3 style="font-size:28px">Hapus catatan ini?</h3><p class="saved-note-text">“${esc(n.question)}”</p><p class="microcopy">Catatan ini akan dihapus dari peramban. Salinan yang sudah diunduh tetap ada.</p><div class="form-actions"><button class="button secondary" data-action="close">Batal</button><button class="button primary" data-action="note-delete-confirm" data-note="${esc(id)}">Hapus catatan</button></div>`);}

document.addEventListener('submit',event=>{
 if(event.target.id!=='setupForm')return;event.preventDefault();
 const data=new FormData(event.target);state.form={topic:String(data.get('topic')),question:String(data.get('question')||''),count:Number(data.get('count'))};
 try{state.reading=newReading(state.form.topic,state.form.question,state.form.count);state.noteId=null;sfx('shuffle');setHash('pilih');}catch(error){toast(error.message);}
});
document.addEventListener('input',event=>{
 const target=event.target;
 if(target.id==='question'){state.form.question=target.value;document.getElementById('questionCounter').textContent=`${target.value.length}/280`;}
 if(target.id==='readingNotes'&&state.reading){state.reading.notes=target.value;document.getElementById('notesCounter').textContent=`${target.value.length}/3000`;if(state.noteId)document.getElementById('saveStatus').textContent='Ada perubahan yang belum disimpan.';}
 if(target.id==='cardSearch'){state.search=target.value;fillLibrary();}
 if(target.id==='soundVolume'){setVolume(target.value);document.getElementById('volumeLabel').textContent=`${target.value}%`;}
});
document.addEventListener('change',event=>{
 const t=event.target;if(t.name==='topic'){state.form.topic=t.value;document.getElementById('exampleQuestion').textContent=TOPICS[t.value].question;}
 if(t.name==='count')state.form.count=Number(t.value);
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]');
 if(!event.target.closest('.sound-control')){document.getElementById('soundSettings').hidden=true;document.getElementById('volumeToggle').setAttribute('aria-expanded','false');}
 if(!button||button.disabled)return;
 const action=button.dataset.action,r=state.reading;
 try{
  if(action==='home')setHash('beranda');
  else if(action==='new'){state.reading=null;state.noteId=null;state.form.question='';sfx('next');setHash('bacaan');}
  else if(action==='edit'){state.form={topic:r.topic,question:r.question,count:r.count};setHash('bacaan');}
  else if(action==='example'){state.form.question=TOPICS[state.form.topic].question;const q=document.getElementById('question');q.value=state.form.question;q.dispatchEvent(new Event('input',{bubbles:true}));q.focus();sfx('select');}
  else if(action==='pick'){if(state.shuffleBusy)return;if(chooseCard(r,button.dataset.id)){sfx('select');updatePickUI(button);}}
  else if(action==='shuffle'){
   if(state.shuffleBusy||r.selected.length)return;state.shuffleBusy=true;button.disabled=true;sfx('shuffle');document.getElementById('pickGrid').classList.add('is-shuffling');document.querySelectorAll('.pick-card').forEach(card=>card.disabled=true);
   setTimeout(()=>{if(state.reading===r){r.candidates=shuffledCards().slice(0,7);if(state.route==='pilih')render({focus:false});}state.shuffleBusy=false;},550);
  }
  else if(action==='reset-picks'){r.selected=[];r.revealed=[];r.current=0;render({focus:false});sfx('shuffle');}
  else if(action==='start-reading'){if(r.selected.length!==r.count)return;r.current=0;sfx('next');setHash('baca');}
  else if(action==='return-pick')setHash('pilih');
  else if(action==='reveal'){
   if(!revealCard(r)||document.getElementById('flipCard').classList.contains('is-open'))return;
   sfx('reveal');const flip=document.getElementById('flipCard');flip.classList.add('is-open');flip.disabled=true;flip.setAttribute('aria-label',`Kartu ${BY_ID[r.selected[r.current]].name} sudah terbuka`);flip.querySelector('.flip-front').removeAttribute('aria-hidden');flip.querySelector('.flip-front').alt=BY_ID[r.selected[r.current]].name;burstAt(flip,'reveal');
   setTimeout(()=>{if(state.route==='baca'&&state.reading===r){render({focus:false});document.getElementById('readerContent')?.querySelector('h2')?.focus();}},matchMedia('(prefers-reduced-motion: reduce)').matches?0:870);
  }
  else if(action==='next'){if(!r.revealed.includes(r.selected[r.current]))return;if(r.current<r.count-1){sfx('next');r.current++;render();}else{sfx('complete');setHash('ringkasan');setTimeout(()=>burstAt(document.querySelector('.finish-medal'),'reveal'),80);}}
  else if(action==='reader-index'){r.current=Number(button.dataset.index);render();sfx('select');}
  else if(action==='return-reader'){r.current=r.count-1;setHash('baca');}
  else if(action==='save'){
   if(!state.noteId)state.noteId=crypto.randomUUID?.()||`${Date.now()}-${r.selected.join('-')}`;
   saveNote(localStorage,r,state.noteId);document.getElementById('saveStatus').textContent='Tersimpan di peramban ini.';sfx('save');toast('Catatan tersimpan. Buka melalui menu Catatan.');
  }
  else if(action==='download-reading')download(currentNote());
  else if(action==='filter'){state.filter=button.dataset.filter;document.querySelectorAll('[data-action="filter"]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});fillLibrary();sfx('select');}
  else if(action==='meaning-tab'){activateMeaningTab(button);sfx('select');}
  else if(action==='card-detail'){cardModal(button.dataset.id);sfx('select');}
  else if(action==='about')about();
  else if(action==='close')modal.close();
  else if(action==='note-open')noteModal(button.dataset.note);
  else if(action==='note-download'){const n=findNote(button.dataset.note);if(n)download(n);else toast('Catatan tidak ditemukan.');}
  else if(action==='note-delete')deletePrompt(button.dataset.note);
  else if(action==='note-delete-confirm'){const id=button.dataset.note,items=getSaved().filter(n=>n.id!==id);localStorage.setItem(STORAGE_KEY,JSON.stringify(items));if(state.noteId===id)state.noteId=null;modal.close();render({focus:false});toast('Catatan dihapus.');}
  else if(action==='sound'){
   button.disabled=true;try{const on=await toggleAudio();button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',on?'Matikan backsound dan efek suara':'Nyalakan backsound dan efek suara');button.querySelector('span').textContent=on?'Suara nyala':'Suara mati';button.querySelector('svg').innerHTML=on?'<path d="M11 5 6 9H3v6h3l5 4zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>':'<path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>';document.getElementById('volumeToggle').hidden=!on;document.getElementById('soundSettings').hidden=!on;document.getElementById('volumeToggle').setAttribute('aria-expanded',String(on));toast(on?'Suara aktif. Atur volume sesuai kenyamananmu.':'Suara dimatikan.');}finally{button.disabled=false;}
  }
  else if(action==='volume'){const p=document.getElementById('soundSettings');p.hidden=!p.hidden;button.setAttribute('aria-expanded',String(!p.hidden));}
 }catch(error){toast(action==='save'?'Catatan belum tersimpan. Penyimpanan peramban mungkin penuh atau dibatasi. Kamu tetap bisa mengunduh bacaan.':error.message||'Langkah ini belum berhasil. Coba sekali lagi.');}
});
modal.addEventListener('click',event=>{if(event.target===modal){const rect=modal.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)modal.close();}});
document.addEventListener('keydown',event=>{const tab=event.target.closest('[role="tab"]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')],i=tabs.indexOf(tab);const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();activateMeaningTab(tabs[next]);});
window.addEventListener('hashchange',()=>render());
render({focus:false});
