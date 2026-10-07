// Balance sim: bots with fixed builds auto-fight and auto-climb for N hours of game time.
// Usage: npm run sim -- [hours] [build,build]
import C from '../src/core.js';
const BUILDS = {
  berserker: { path: ['warrior','berserker'], ratio: {str:3,vit:1,dex:1}, skills: ['power_strike','cleave','bloodthirst','rampage','blood_frenzy','war_cry','iron_skin','second_wind'], kind:'phys' },
  paladin: { path: ['warrior','paladin'], ratio: {str:2,vit:2}, skills: ['power_strike','cleave','holy_strike','iron_skin','retribution','divine_shield','second_wind','war_cry'], kind:'phys' },
  assassin: { path: ['rogue','assassin'], ratio: {dex:3,luk:1,str:1}, skills: ['power_strike','twin_strike','assassinate','exploit','lethality','poison_blade','execute','evasion'], kind:'phys' },
  ranger: { path: ['rogue','ranger'], ratio: {dex:2,luk:1,str:1,vit:1}, skills: ['power_strike','twin_strike','volley','quick_draw','lethality','poison_blade','snare','evasion'], kind:'phys' },
  pyro: { path: ['mage','pyromancer'], ratio: {int:3,vit:1}, skills: ['power_strike','fireball','meteor','ignite','arcane_mind','combustion','frost_nova','mana_shield'], kind:'magic' },
  necro: { path: ['mage','necromancer'], ratio: {int:2,vit:2}, skills: ['power_strike','fireball','life_drain','raise_skeleton','curse','arcane_mind','mana_shield','frost_nova'], kind:'magic' },
  // deliberately bad: all STR on a mage, glass
  allstr_warrior: { path: ['warrior','berserker'], ratio: {str:1}, skills: ['power_strike','cleave','rampage','bloodthirst','blood_frenzy','war_cry'], kind:'phys' },
  allvit_paladin: { path: ['warrior','paladin'], ratio: {vit:1}, skills: ['power_strike','cleave','holy_strike','iron_skin','retribution','divine_shield'], kind:'phys' },
};
function score(p, eq, kind) {
  const st = C.computeStats(p, p.floor, eq);
  const off = (kind==='magic'?st.matk:st.atk)*(st.spd/100)*(1+st.crit/100*(st.critdmg-100)/100) * ((kind==='magic') === (st.basic==='magic') ? 1 : 0.6);
  const def = st.hp/(1-(st.physRed+st.magRed)/2);
  return off*Math.sqrt(def);
}
function bot(p, B) {
  // class
  const a = C.canAdvance(p); if (a && a.ready) C.advance(p, B.path[C.CLASSES[p.cls].tier]);
  // stats
  const tot = Object.values(B.ratio).reduce((x,y)=>x+y,0);
  while (p.statPts > 0) {
    const allocSum = Object.keys(B.ratio).reduce((s,k)=>s+p.alloc[k],0)+1;
    let best=null, bd=-1;
    for (const k in B.ratio) { const d = B.ratio[k]/tot - p.alloc[k]/allocSum; if (d>bd){bd=d;best=k;} }
    p.alloc[best]++; p.statPts--;
  }
  // skills
  let guard=0;
  while (p.skillPts>0 && guard++<50) {
    const known = C.knownSkills(p);
    let done=false;
    for (const id of B.skills) if (known.includes(id) && (p.skills[id]||0) < C.SKILLS[id].max && (!(p.skills[id]) || (p.skills[id]||0) < 10)) { if (C.learn(p,id)) {done=true;break;} }
    if(!done)break;
  }
  // loadout: top 3 actives by build order, skip power_strike once class skills exist
  const acts = B.skills.filter(id => C.SKILLS[id].type==='active' && p.skills[id]);
  const nonNov = acts.filter(x=>x!=='power_strike');
  p.loadout = (nonNov.length>=2?nonNov:acts).slice(0,3);
  // gear
  for (const it of p.inv.slice()) {
    const eq = Object.assign({}, p.equip); eq[it.slot]=it;
    if (score(p,eq,B.kind) > score(p,p.equip,B.kind)*1.001) C.equip(p,it.id);
  }
  for (const it of p.inv.slice()) C.salvage(p,it.id);
  // enhance: lowest enh first, weapon priority
  for (let k=0;k<20;k++){
    const items = C.SLOTS.map(s=>p.equip[s]).filter(Boolean).sort((x,y)=>(x.enh-(x.slot==='weapon'?2:0))-(y.enh-(y.slot==='weapon'?2:0)));
    if(!items.length)break;
    const r = C.enhance(p, items[0].id); if(!r.ok)break;
  }
}
function run(name, hours) {
  const B = BUILDS[name]; const p = C.newPlayer(); p.autoSalvage=0; p.autoClimb=true;
  const log = ()=>{};
  let t=0, b=C.Battle(p,log), cps=[], next=3600;
  const end = hours*3600;
  let rest=0, botT=0; const AR={};
  while (t<end) {
    if (rest>0){ rest-=C.DT; t+=C.DT; continue; }
    const r = C.tick(b,p); t+=C.DT;
    if (r) {
      if (!b.e.boss) { const A=(AR[b.e.arch]=AR[b.e.arch]||{t:0,n:0,d:0}); A.t+=b.t; A.n++; if(r==='lose')A.d++; }
      if (r==='win') C.onWin(p,b,log); else { C.onLose(p,b,log); rest=3; }
      rest += 0.5;
      if (t-botT>30){ bot(p,B); botT=t; }
      b = C.Battle(p,log);
    }
    if (t>=next){ cps.push(`${next/3600}h L${p.lvl} F${p.maxFloor} d${p.stats.deaths}`); next+=3600; }
  }
  const st=C.computeStats(p,p.floor);
  const enh = C.SLOTS.map(s=>p.equip[s]?p.equip[s].enh:'-').join(',');
  console.log(name.padEnd(15), cps.slice(-1).join(''), Object.entries(AR).map(([k,v])=>`${k}:${(v.t/v.n).toFixed(1)}s/${(100*v.d/v.n).toFixed(1)}%`).join(' '));
}
const H = +process.argv[2]||6;
for (const n of (process.argv[3]?process.argv[3].split(','):Object.keys(BUILDS))) run(n,H);
