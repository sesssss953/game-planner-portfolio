/* Goose Cup game logic */
(() => {
  const app = document.querySelector('#app');
  const players = [
    {name:'闪电鹅',rank:'S',role:'前锋',speed:95,power:80,skill:88,pos:'0% 35%'},
    {name:'火焰鹅',rank:'A',role:'前锋',speed:90,power:85,skill:80,pos:'33% 35%'},
    {name:'灵动鹅',rank:'B',role:'中场',speed:85,power:70,skill:92,pos:'66% 35%'},
    {name:'铁壁鹅',rank:'C',role:'后卫',speed:70,power:95,skill:60,pos:'100% 35%'},
    {name:'疾风鹅',rank:'A',role:'前锋',speed:88,power:78,skill:85,pos:'0% 71%'},
    {name:'战术鹅',rank:'B',role:'中场',speed:75,power:86,skill:82,pos:'33% 71%'},
    {name:'守门鹅',rank:'C',role:'后卫',speed:60,power:90,skill:65,pos:'66% 71%'},
    {name:'呆萌鹅',rank:'F',role:'替补',speed:50,power:60,skill:50,pos:'100% 71%'}
  ];
  // 20 collectible geese. The original eight illustrated card positions are retained;
  // extra geese share their visual family in the team screen but keep their own stats.
  const extraPlayers = [
    ['雷霆鹅','S','前锋',97,86,91],['冰霜鹅','A','中场',82,77,96],['烈风鹅','S','前锋',99,79,90],
    ['磐石鹅','A','后卫',68,98,72],['幻影鹅','A','中场',93,72,94],['金靴鹅','S','前锋',96,91,87],
    ['守望鹅','B','后卫',74,92,78],['星耀鹅','S','前锋',94,89,95],['旋风鹅','A','中场',91,75,89],
    ['铁羽鹅','B','后卫',72,94,76],['神射鹅','S','前锋',98,88,93],['小将鹅','B','替补',84,73,80]
  ];
  extraPlayers.forEach((x,j)=>players.push({name:x[0],rank:x[1],role:x[2],speed:x[3],power:x[4],skill:x[5],pos:players[j%8].pos,artSlot:j%8}));
  players.forEach((p,i)=>{if(p.artSlot===undefined)p.artSlot=i%8});
  const state = {
    screen:'cover', selected:[], packs:3, collection:[0,1,2,3,4,5,6,7],
    sound:true, toastTimer:null, match:null
  };

  try {
    const saved = JSON.parse(localStorage.getItem('goose-cup-save') || '{}');
    if (saved.version === 2) {
      if (Array.isArray(saved.selected)) state.selected = saved.selected.slice(0,5).filter(i=>Number.isInteger(i)&&i>=0&&i<players.length);
      if (Array.isArray(saved.collection)) state.collection = saved.collection.filter(i=>Number.isInteger(i)&&i>=0&&i<players.length);
      if (Number.isFinite(saved.packs)) state.packs = saved.packs;
    }
  } catch (_) {}

  function save(){
    try {
      localStorage.setItem('goose-cup-save', JSON.stringify({version:2,selected:state.selected,packs:state.packs,collection:state.collection}));
    } catch (_) {
      // Storage can be restricted for file:// pages; never let saving break gameplay.
    }
  }
  function mount(html){
    app.innerHTML = `<div class="phone">${html}</div>`;
  }
  function go(screen){
    if(state.match) stopMatch();
    state.screen = screen;
    ({cover:renderCover,home:renderHome,team:renderTeam,gacha:renderGacha,match:renderMatch}[screen] || renderHome)();
  }
  function toast(message){
    const phone = app.querySelector('.phone'); if(!phone) return;
    phone.querySelector('.toast')?.remove();
    const el = document.createElement('div'); el.className='toast'; el.textContent=message; phone.append(el);
    clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>el.remove(),1900);
  }
  function sfx(type='tap'){
    if(!state.sound) return;
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext, ctx=new Ctx();
      const osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.type=type==='goal'?'sawtooth':'sine'; osc.frequency.value=type==='goal'?440:620;
      gain.gain.setValueAtTime(.035,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+(type==='goal'?.45:.08));
      osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+(type==='goal'?.45:.08));
    }catch(_){}
  }

  function renderCover(){
    mount(`<section class="screen cover-screen">
      <img class="reference-bg" src="assets/cover.png" alt="鹅王杯封面，蓝红两队球员在绿茵场对阵" />
      <div class="shine"></div>
      <button class="hotspot cover-start tap-pulse" aria-label="开始游戏"></button>
    </section>`);
    app.querySelector('.cover-start').onclick=()=>{sfx();go('home')};
  }

  function renderHome(){
    mount(`<section class="screen home-screen">
      <img class="reference-bg" src="assets/home.png" alt="鹅王杯主界面" />
      <button class="hotspot home-gacha" aria-label="抽卡"></button>
      <button class="hotspot home-team" aria-label="组建阵型"></button>
      <button class="hotspot home-match tap-pulse" aria-label="开始对战"></button>
    </section>`);
    app.querySelector('.home-gacha').onclick=()=>{sfx();go('gacha')};
    app.querySelector('.home-team').onclick=()=>{sfx();go('team')};
    app.querySelector('.home-match').onclick=()=>{sfx();go('match')};
  }

  function renderTeam(){
    const slots = Array.from({length:5},(_,i)=>{
      const playerId=state.selected[i], p=players[playerId];
      return p
        ? `<button class="lineup-chip filled" data-player="${playerId}" style="--card:url('assets/cards/player-${p.artSlot+1}.png')" aria-label="已选择${p.name}，点击移除"></button>`
        : `<div class="lineup-chip" aria-hidden="true">＋</div>`;
    }).join('');
    const cards = Array.from({length:8},(_,i)=>{const chosen=state.selected.find(id=>players[id]?.artSlot===i);return `<button class="player-hit ${chosen!==undefined?'selected':''}" data-slot="${i}" aria-label="选择第${i+1}类球员"><span class="select-check">✓</span></button>`}).join('');
    mount(`<section class="screen team-screen">
      <img class="reference-bg" src="assets/team.png" alt="球员阵容组建界面" />
      <button class="back" aria-label="返回">←</button>
      <div class="lineup" aria-label="当前首发阵容">${slots}</div>
      <div class="team-cards">${cards}</div>
      <button class="hotspot team-gacha" aria-label="前往抽卡"></button>
      <button class="hotspot team-confirm tap-pulse" aria-label="确定组建"></button>
    </section>`);
    app.querySelector('.back').onclick=()=>go('home');
    app.querySelector('.team-gacha').onclick=()=>go('gacha');
    app.querySelectorAll('.lineup-chip.filled').forEach(card=>card.onclick=()=>{
      state.selected=state.selected.filter(id=>id!==+card.dataset.player);sfx();save();renderTeam();
    });
    app.querySelectorAll('.player-hit').forEach(btn=>btn.onclick=()=>{
      sfx(); const slot=+btn.dataset.slot;
      const owned=state.collection.filter(id=>players[id]?.artSlot===slot);
      if(!owned.length){toast('该位置的球员尚未解锁！去抽卡收集鹅球员');return;}
      const already=state.selected.find(id=>players[id]?.artSlot===slot);
      if(already!==undefined){state.selected=state.selected.filter(id=>players[id]?.artSlot!==slot);renderTeam();save();return;}
      if(state.selected.length>=5){toast('首发阵容最多 5 名球员');return;}
      const pick=owned[owned.length-1];state.selected.push(pick);renderTeam();save();
    });
    app.querySelector('.team-confirm').onclick=()=>{
      if(state.selected.length!==5){toast(`还需选择 ${5-state.selected.length} 名球员`);return;}
      save();sfx('goal');toast('阵容已保存！');setTimeout(()=>go('home'),650);
    };
  }

  function renderGacha(){
    mount(`<section class="screen gacha-screen">
      <img class="reference-bg" src="assets/gacha.png" alt="点击卡包抽取球员" />
      <button class="back" aria-label="返回">←</button>
      <div class="pack-count">剩余卡包 ${state.packs}</div><div class="gacha-flare"></div><div class="unlock-count">已解锁 ${state.collection.length}/20</div>
      <button class="hotspot pack-hit tap-pulse" aria-label="打开卡包"></button>
    </section>`);
    app.querySelector('.back').onclick=()=>go('home');
    app.querySelector('.pack-hit').onclick=openPack;
  }
  function openPack(){
    if(state.packs<=0){toast('卡包已用完，赢得比赛可补充卡包');return;}
    sfx('goal'); state.packs--; const locked=players.map((_,i)=>i).filter(i=>!state.collection.includes(i));
    const pool=locked.length?locked:players.map((_,i)=>i);
    const i=pool[Math.floor(Math.random()*pool.length)], p=players[i];
    const isNew=!state.collection.includes(i); if(isNew)state.collection.push(i); save();
    const modal=document.createElement('div'); modal.className='gacha-modal';
    modal.innerHTML=`<div class="reveal-card">
      <div class="reveal-rank">${p.rank}</div><div class="reveal-tag">${isNew?'新成员解锁':'重复获得'}</div><div class="reveal-goose"></div>
      <div class="reveal-name">${p.name} <small>${p.role} · ${i+1}/20</small></div>
      <div class="reveal-stats"><span>⚡${p.speed}</span><span>● ${p.power}</span><span>◎ ${p.skill}</span></div>
    </div><button class="modal-close">${isNew?'✦ 收下新伙伴 ✦':'重复球员 · 收下'}</button>`;
    app.querySelector('.phone').append(modal);
    app.querySelector('.pack-count').textContent=`剩余卡包 ${state.packs}`;app.querySelector('.unlock-count').textContent=`已解锁 ${state.collection.length}/20`;
    modal.querySelector('.modal-close').onclick=()=>modal.remove();
  }

  function renderMatch(){
    const roster=state.selected.length===5?state.selected:[0,1,2,3,6];
    const starts=[[20,28],[39,34],[27,47],[20,55],[68,30],[81,41],[69,49],[79,56]];
    const gooseHTML=Array.from({length:8},(_,i)=>{
      const home=i<4, pi=home?roster[i]:[1,4,5,2][i-4];
      return `<div class="goose3d ${home?'blue':'red'}" data-id="${i}" data-player="${pi}" style="left:${starts[i][0]}%;top:${starts[i][1]}%"><span class="goose-shadow"></span><span class="goose-sprite" aria-hidden="true"></span></div>`;
    }).join('');
    mount(`<section class="screen match-screen art-match">
      <img class="reference-bg" src="assets/match-clean.png" alt="鹅王杯原版绿茵场比赛界面" />
      <img class="match-ui-slice match-ui-top" src="assets/match-ref.png" alt="" aria-hidden="true" />
      <img class="match-ui-slice match-ui-bottom" src="assets/match-ref.png" alt="" aria-hidden="true" />
      <img class="keeper keeper-away" src="assets/goalie-red.png" alt="对方守门员" />
      <img class="keeper keeper-home" src="assets/goalie-blue.png" alt="我方守门员" />
      <div class="live-score"><span id="score">0 : 0</span><span id="timer">00:45</span></div>
      <button class="hotspot art-hot art-pause pause-btn" aria-label="暂停"></button><button class="hotspot art-hot art-speed speed-btn" aria-label="切换倍速">1×</button>
      <div class="commentary" id="commentary">开球！</div>
      ${gooseHTML}<div class="ball"></div>
      <div class="live-points" id="points">3</div>
      <button class="hotspot art-hot art-freeze freeze-card" aria-label="对方静止"></button><button class="hotspot art-hot art-boost boost-card" aria-label="超鹅行动"></button>
      <button class="hotspot art-hot art-draw draw-prop" aria-label="抽取道具"></button>
    </section>`);
    state.match={score:[0,0],time:45,points:3,props:{freeze:0,boost:0},speed:1,paused:false,frozenUntil:0,boostUntil:0,ended:false,elapsed:0,spin:0};
    const m=state.match; setupMatchButtons();positionKickoff();
    m.secondTimer=setInterval(()=>{if(!state.match||m.paused||m.ended)return;m.points++;m.time=Math.max(0,m.time-m.speed);m.elapsed++;updateMatchUI();if(m.time<=0)finishMatch()},1000);
    m.playTimer=setInterval(playTick,760);setTimeout(()=>say('比赛开始！双方自动对战'),200);
  }

  function setupMatchButtons(){
    const m=state.match;
    app.querySelector('.pause-btn').onclick=e=>{
      m.paused=!m.paused;e.currentTarget.classList.toggle('on',m.paused);e.currentTarget.textContent=m.paused?'▶':'Ⅱ';say(m.paused?'比赛已暂停':'继续比赛');
    };
    app.querySelector('.speed-btn').onclick=e=>{
      m.speed=m.speed===1?1.5:m.speed===1.5?2:1;e.currentTarget.textContent=`${m.speed}×`;e.currentTarget.classList.toggle('on',m.speed>1);say(`已切换 ${m.speed} 倍速`);
    };
    app.querySelector('.draw-prop').onclick=()=>{
      if(m.points<3){say('教练点不足');return;}
      m.points-=3; const type=Math.random()<.5?'freeze':'boost';m.props[type]++;sfx();say(type==='freeze'?'抽到「对方静止」！':'抽到「超鹅行动」！');updateMatchUI();
    };
    app.querySelector('.freeze-card').onclick=()=>useProp('freeze');
    app.querySelector('.boost-card').onclick=()=>useProp('boost');
  }

  function useProp(type){
    const m=state.match;if(!m||m.props[type]<1)return;m.props[type]--;const now=Date.now();
    if(type==='freeze'){m.frozenUntil=now+5000;say('对方全员静止 5 秒！');}
    else{m.boostUntil=now+5000;say('我方速度提升 50%！');}
    sfx('goal');updateMatchUI();applyEffects();
  }
  function applyEffects(){
    const m=state.match;if(!m)return;const now=Date.now();
    app.querySelectorAll('.goose3d.red').forEach(x=>x.classList.toggle('frozen',now<m.frozenUntil));
    app.querySelectorAll('.goose3d.blue').forEach(x=>x.classList.toggle('boost',now<m.boostUntil));
  }

  function updateMatchUI(){
    const m=state.match;if(!m)return;
    app.querySelector('#score').textContent=`${m.score[0]} : ${m.score[1]}`;
    app.querySelector('#timer').textContent=`00:${String(Math.ceil(m.time)).padStart(2,'0')}`;
    app.querySelector('#points').textContent=m.points;
    const freezeQty=app.querySelector('#freezeQty'),boostQty=app.querySelector('#boostQty');
    if(freezeQty)freezeQty.textContent=m.props.freeze;if(boostQty)boostQty.textContent=m.props.boost;
    app.querySelector('.freeze-card').classList.toggle('available',m.props.freeze>0);app.querySelector('.boost-card').classList.toggle('available',m.props.boost>0);
    app.querySelector('.draw-prop').classList.toggle('unaffordable',m.points<3);applyEffects();
  }

  function positionKickoff(){
    const starts=[[20,28],[39,34],[27,47],[20,55],[68,30],[81,41],[69,49],[79,56]];
    app.querySelectorAll('.goose3d').forEach((g,i)=>{g.style.left=`${starts[i][0]}%`;g.style.top=`${starts[i][1]}%`});
    const b=app.querySelector('.ball');if(b){b.style.left='48%';b.style.top='46%'}
  }

  function playTick(){
    const m=state.match;if(!m||m.paused||m.ended)return;const now=Date.now(), frozen=now<m.frozenUntil, boosted=now<m.boostUntil;
    app.querySelectorAll('.goose3d').forEach((g,i)=>{
      const red=i>=4;if(red&&frozen)return;
      const minX=red?50:8,maxX=red?84:48,minY=20,maxY=57;
      const oldX=parseFloat(g.style.left)||50;
      const nextX=minX+Math.random()*(maxX-minX);
      g.classList.toggle('face-left',nextX<oldX);g.classList.toggle('face-right',nextX>=oldX);
      g.style.left=`${nextX}%`;g.style.top=`${minY+Math.random()*(maxY-minY)}%`;
    });
    const ball=app.querySelector('.ball'); if(!ball)return;
    const homeAttack=Math.random() < (.5+(boosted ? .16 : 0)-(frozen ? .02 : 0));
    const bx=homeAttack?50+Math.random()*37:8+Math.random()*42, by=18+Math.random()*55;
    ball.style.left=`${bx}%`;ball.style.top=`${by}%`;m.spin+=180;ball.style.transform=`rotate(${m.spin}deg)`;
    const chance=(boosted ? .09 : .045)+((frozen&&homeAttack) ? .04 : 0);
    if(Math.random()<chance*m.speed)goal(homeAttack?0:1);
    else if(Math.random()<.18)say(['漂亮的传球！','门将稳稳没收','中场展开争夺','反击机会来了','皮球擦柱而出'][Math.floor(Math.random()*5)]);
  }

  function goal(side){
    const m=state.match;if(!m||m.ended)return;m.score[side]++;updateMatchUI();sfx('goal');say(side===0?'我方破门得分！':'对方进球！');
    const fx=document.createElement('div');fx.className=side===0?'goal-flash cheer-fx':'goal-flash concede-fx';fx.innerHTML=side===0?'<strong>GOAL!</strong><span>🎉　🙌　🎉　🙌　🎉</span>':'<strong>失球！</strong><span class="black-streaks">━━━━━━━━━━━━<br>━━━━━━━<br>━━━━━━━━━━</span>';app.querySelector('.phone').append(fx);setTimeout(()=>fx.remove(),1400);
    app.querySelectorAll('.goose3d.blue').forEach(g=>g.classList.toggle('celebrate',side===0));app.querySelectorAll('.goose3d.red').forEach(g=>g.classList.toggle('celebrate',side===1));setTimeout(()=>app.querySelectorAll('.goose3d.celebrate').forEach(g=>g.classList.remove('celebrate')),1300);positionKickoff();
  }
  function say(text){
    const el=app.querySelector('#commentary');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(state.match?.sayTimer);if(state.match)state.match.sayTimer=setTimeout(()=>el.classList.remove('show'),1200);
  }

  function finishMatch(){
    const m=state.match;if(!m||m.ended)return;m.ended=true;
    if(m.score[0]===m.score[1])m.score[Math.random()<.58?0:1]++;
    updateMatchUI();const win=m.score[0]>m.score[1];if(win){state.packs++;save();}
    showArtResult(win);
  }
  function stopMatch(){
    const m=state.match;if(!m)return;clearInterval(m.secondTimer);clearInterval(m.playTimer);clearTimeout(m.sayTimer);state.match=null;
  }

  /* Keep the match simulation live and use the supplied result artwork. */
  function showArtResult(win){
    stopMatch();
    mount(`<section class="screen result-art-screen">
      <img class="result-art" src="assets/${win?'result-win':'result-lose'}.png" alt="${win?'比赛胜利':'比赛失败'}结算界面" />
      <button class="hotspot result-primary" aria-label="${win?'继续游戏':'再来一局'}"></button>
      <button class="hotspot result-home" aria-label="返回主页"></button>
    </section>`);
    app.querySelector('.result-primary').onclick=()=>renderMatch();
    app.querySelector('.result-home').onclick=()=>go('home');
  }

  renderCover();
})();
