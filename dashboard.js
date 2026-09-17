"use strict";
const $=id=>document.getElementById(id);
const money=new Intl.NumberFormat("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2});
function renderAdaActivity(data){
  const a=data.ada_activity;if(!a){$("ada-mode").textContent="Export wartet auf Neustart";
    for(const id of ["scalp-return","scalp-realized","scalp-unrealized","scalp-fees","scalp-net","stat-trades","stat-winrate","stat-avg-win","stat-avg-loss","stat-maker","stat-maker-taker","period-24h","period-7d","period-all"])$(id).textContent="–";
    $("scalp-detail").textContent="Neue ADA-Kennzahlen nach Bot-Neustart verfügbar";return}
  const amount=n=>`${Number(n)>0?"+":""}${Number(n).toFixed(4)} USD`;
  const price=n=>`${Number(n).toFixed(5)} USD`;
  const date=t=>new Date(t).toLocaleString("de-CH",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
  const labels={waiting:"Wartet auf Einstieg",buy_pending:"Kauflimit wartet",position:"Position offen",paused:"Einstieg pausiert",error:"Bot meldet einen Fehler"};
  $("ada-mode").textContent=labels[a.mode]||"Status unbekannt";
  $("ada-period").textContent=a.started_at?`Neue 6-Kerzen-Strategie seit ${date(a.started_at)} · Datenstand ${date(a.data_at)}`:"Strategie beginnt nach Schließen des Altbestands";
  $("ada-stats-period").textContent=`ADA · ${a.started_at?`seit Strategiestart ${date(a.started_at)}`:"Strategie noch nicht gestartet"} · alte Strategiedaten ausgeblendet`;
  const steps=$("ada-steps");steps.replaceChildren();
  for(let i=0;i<a.required_closes;i++){const dot=document.createElement("i");dot.classList.toggle("on",i<(a.signal?.falling_closes||0));steps.append(dot)}
  $("ada-signal-text").textContent=a.signal?`${a.signal.falling_closes} von ${a.required_closes} fallenden Schlusskursen`:"Signalstatus nach Bot-Neustart verfügbar";
  $("ada-trend").textContent=a.signal?`Kurs unter EMA40: ${a.signal.trend_ok?"ja":"nein"} · Kerze ${date(a.signal.candle_at)}`:"";
  const box=$("ada-position");box.hidden=!a.position&&!a.active_order;
  if(a.position){const p=a.position;box.textContent=`Einstieg ${price(p.entry_price)} · Offen ${amount(p.unrealized_pnl_usd)} · Haltedauer ${duration((new Date(a.data_at)-new Date(p.opened_at))/1000)} · Ziel ${p.target_price?price(p.target_price):"–"} · Stop-Schwelle ${p.stop_price?price(p.stop_price):"–"}`}
  else if(a.active_order){box.textContent=`Kauflimit ${price(a.active_order.price)} · ${a.active_order.quantity} ADA · offen seit ${duration(a.active_order.age_seconds)}`}
  const list=$("ada-timeline");list.replaceChildren();
  const reasons={TAKE_PROFIT:"Gewinnziel erreicht",STOP_LOSS:"Stop-Ausstieg ausgeführt",TIMEOUT:"Zeitlimit erreicht",DAY_END:"Tagesende",SPLIT_ADJUSTMENT:"Kapitalanpassung"};
  for(const t of a.timeline){const card=document.createElement("article");card.className="ada-trade-card";
    const gain=document.createElement("strong");gain.textContent=amount(t.net_pnl_usd);gain.className=t.net_pnl_usd>=0?"positive":"negative";
    const reason=document.createElement("span");reason.className="ada-reason";reason.textContent=reasons[t.reason]||"Position geschlossen";
    const detail=document.createElement("small");detail.textContent=`${price(t.entry_price)} → ${price(t.exit_price)} · ${duration(t.hold_seconds)}`;
    const stamp=document.createElement("small");stamp.textContent=date(t.closed_at);card.append(gain,reason,detail,stamp);list.append(card)}
  if(!a.timeline.length)list.textContent="Noch keine abgeschlossenen Trades der neuen Strategie.";
  const more=$("ada-more");more.hidden=a.timeline.length<=6;let expanded=false;
  const fold=()=>{[...list.children].forEach((card,i)=>card.hidden=!expanded&&i>=6);more.textContent=expanded?"Weniger anzeigen":`${a.timeline.length-6} weitere Trades anzeigen`;more.setAttribute("aria-expanded",String(expanded))};
  more.onclick=()=>{expanded=!expanded;fold()};fold();
  $("ada-integrity").textContent=a.count_matches_state?"Ein Trade umfasst Kauf und vollständigen Verkauf; Teilfüllungen werden zusammengefasst.":"Die rekonstruierte Trade-Anzahl weicht vom Zähler ab. Historie bitte prüfen.";
  const s=data.performance_details.scalping;
  for(const [id,key] of [["scalp-realized","realized_pnl_usd"],["scalp-unrealized","unrealized_pnl_usd"],["scalp-net","net_pnl_usd"],["stat-avg-win","average_win_usd"],["stat-avg-loss","average_loss_usd"]])$(id).textContent=s[key]==null?"–":amount(s[key]);
  $("scalp-fees").textContent=`${Number(s.fees_usd).toFixed(4)} USD`;
  for(const [id,key] of [["period-24h","last_24h"],["period-7d","last_7d"],["period-all","since_start"]])$(id).textContent=`${amount(s[key].pnl_usd)} · ${s[key].trades} Trades`;
  drawAdaPrice(a);
}
function drawAdaPrice(a){
 const canvas=$("ada-price-chart"),ctx=canvas.getContext("2d"),rows=(a.candles||[]).filter(r=>Number.isFinite(Number(r.value)));
 $("ada-chart-empty").hidden=rows.length>1;
 $("ada-price-time").textContent=rows.length?`M1 · ${new Date(rows.at(-1).time).toLocaleString("de-CH")}`:"Noch keine Kursdaten";
 function draw(){const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);if(rows.length<2)return;
 const levels=a.position?[[a.position.entry_price,"Einstieg","#5dc9ff"],[a.position.target_price,"Ziel","#3ce5ae"],[a.position.stop_price,"Stop","#ffbd5a"]].filter(x=>x[0]>0):[];
 const vals=rows.map(r=>Number(r.value)).concat(levels.map(x=>x[0]));let lo=Math.min(...vals),hi=Math.max(...vals),pad=Math.max((hi-lo)*.15,.00005);lo-=pad;hi+=pad;
 const t0=Date.parse(rows[0].time),t1=Date.parse(rows.at(-1).time),x=t=>68+(t-t0)/(t1-t0)*(w-85),y=v=>14+(hi-v)/(hi-lo)*(h-40);
 ctx.font="11px system-ui";ctx.textAlign="right";ctx.fillStyle="#78978e";
 for(let i=0;i<4;i++){let v=lo+(hi-lo)*i/3;ctx.fillText(v.toFixed(5),60,y(v)+4);ctx.strokeStyle="#20392f";ctx.beginPath();ctx.moveTo(68,y(v));ctx.lineTo(w-15,y(v));ctx.stroke()}
 ctx.beginPath();rows.forEach((r,i)=>i?ctx.lineTo(x(Date.parse(r.time)),y(r.value)):ctx.moveTo(x(Date.parse(r.time)),y(r.value)));ctx.strokeStyle="#3ce5ae";ctx.lineWidth=2;ctx.stroke();
 for(const [v,label,color] of levels){ctx.strokeStyle=color;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(68,y(v));ctx.lineTo(w-15,y(v));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=color;ctx.fillText(label,w-18,y(v)-5)}
 for(const m of a.markers||[]){const t=Date.parse(m.time);if(t<t0||t>t1)continue;ctx.fillStyle=m.side==="BUY"?"#5dc9ff":"#ffffff";ctx.beginPath();ctx.arc(x(t),y(m.price),4,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle="#78978e";ctx.textAlign="left";ctx.fillText(new Date(t0).toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"}),68,h-4);ctx.textAlign="right";ctx.fillText(new Date(t1).toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"}),w-15,h-4);
 }new ResizeObserver(draw).observe(canvas);draw();
}
const pct=(value,signed=false)=>`${signed&&value>0?"+":""}${Number(value).toFixed(2)} %`;
const usd=value=>`${money.format(Number(value))} USD`;
function performance(el,value){const n=Number(value);el.textContent=pct(n,true);el.classList.toggle("negative",n<0);el.classList.toggle("positive",n>=0)}
function updateStatus(time,mode){const el=$("status"),age=(Date.now()-new Date(time).getTime())/60000;el.classList.remove("stale","offline");let text=`${mode||"BOT"} · AKTUELL`;if(!Number.isFinite(age)||age>30){el.classList.add("offline");text=`${mode||"BOT"} · KEINE AKTUELLEN DATEN`}else if(age>10){el.classList.add("stale");text=`${mode||"BOT"} · VERZOEGERT`}el.querySelector("span").textContent=text;$("last-update").textContent=`Aktualisiert ${new Date(time).toLocaleString("de-CH",{dateStyle:"medium",timeStyle:"short"})}`}
function renderPositions(positions){const body=$("positions-body");body.replaceChildren();$("empty-positions").hidden=positions.length!==0;$("position-count").textContent=`${positions.length} ${positions.length===1?"Position":"Positionen"}`;positions.forEach(p=>{const change=p.change_since_buy_pct,known=change!==null&&change!==undefined,cls=known&&Number(change)>=0?"positive":known?"negative":"",row=document.createElement("tr");row.innerHTML=`<td><div class="asset"><span class="asset-icon">${p.symbol.slice(0,2)}</span><span class="asset-name"><b>${p.symbol}</b><span>${p.average_buy_price?`Kauf Ø ${usd(p.average_buy_price)}`:p.name}</span></span></div></td><td>${usd(p.value)}</td><td>${pct(p.allocation_pct)}</td><td class="${cls}">${known?pct(change,true):"–"}</td>`;body.appendChild(row)})}
function renderTrades(trades){const list=$("trades-list"),empty=$("empty-trades");list.replaceChildren();empty.hidden=trades.length!==0;trades.forEach(trade=>{const item=document.createElement("article"),buy=trade.side==="BUY",fee=`${money.format(Number(trade.fee))} ${trade.fee_currency||"USD"}`;item.className="trade-row";item.innerHTML=`<div class="trade-side ${buy?"buy":"sell"}">${buy?"KAUF":"VERKAUF"}</div><div class="trade-main"><div><b>${trade.symbol}</b><time>${new Date(trade.time).toLocaleString("de-CH",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</time></div><strong>${usd(trade.value)}</strong></div><div class="trade-details"><span>${Number(trade.quantity).toLocaleString("de-CH",{maximumFractionDigits:8})} @ ${usd(trade.price)}</span><span>Gebuehr ${fee}${trade.liquidity?` · ${trade.liquidity}`:""}</span></div>`;list.appendChild(item)})}
function renderChart(history){const canvas=$("equity-chart"),tip=$("chart-tooltip"),ctx=canvas.getContext("2d");let points=[];function draw(){const ratio=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);if(history.length<2)return;const pad={top:14,right:16,bottom:30,left:54},values=history.map(i=>Number(i.value));let min=Math.min(...values),max=Math.max(...values);const buffer=Math.max((max-min)*.2,max*.005);min-=buffer;max+=buffer;const x=i=>pad.left+i/(history.length-1)*(w-pad.left-pad.right),y=v=>pad.top+(max-v)/(max-min)*(h-pad.top-pad.bottom);ctx.font="11px system-ui";ctx.textBaseline="middle";for(let i=0;i<4;i++){const yy=pad.top+i/3*(h-pad.top-pad.bottom),label=max-i/3*(max-min);ctx.strokeStyle="rgba(148,190,177,.10)";ctx.beginPath();ctx.moveTo(pad.left,yy);ctx.lineTo(w-pad.right,yy);ctx.stroke();ctx.fillStyle="#78978e";ctx.textAlign="right";ctx.fillText(money.format(label),pad.left-10,yy)}points=history.map((item,i)=>({x:x(i),y:y(Number(item.value)),item}));const gradient=ctx.createLinearGradient(0,pad.top,0,h-pad.bottom);gradient.addColorStop(0,"rgba(60,229,174,.25)");gradient.addColorStop(1,"rgba(60,229,174,0)");ctx.beginPath();ctx.moveTo(points[0].x,h-pad.bottom);points.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(points.at(-1).x,h-pad.bottom);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle="#3ce5ae";ctx.lineWidth=2.3;ctx.lineJoin="round";ctx.shadowColor="rgba(60,229,174,.4)";ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0;const last=points.at(-1);ctx.beginPath();ctx.arc(last.x,last.y,4,0,Math.PI*2);ctx.fillStyle="#3ce5ae";ctx.fill();ctx.textAlign="center";ctx.textBaseline="top";ctx.fillStyle="#78978e";[0,Math.floor((history.length-1)/2),history.length-1].forEach(i=>ctx.fillText(new Date(history[i].time).toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"}),x(i),h-pad.bottom+11))}canvas.addEventListener("pointermove",event=>{if(!points.length)return;const rect=canvas.getBoundingClientRect(),mx=event.clientX-rect.left,nearest=points.reduce((a,b)=>Math.abs(b.x-mx)<Math.abs(a.x-mx)?b:a);tip.hidden=false;tip.style.left=`${nearest.x}px`;tip.style.top=`${nearest.y}px`;tip.innerHTML=`<b>${usd(nearest.item.value)}</b><br>${new Date(nearest.item.time).toLocaleString("de-CH",{dateStyle:"medium",timeStyle:"short"})}`});canvas.addEventListener("pointerleave",()=>tip.hidden=true);new ResizeObserver(draw).observe(canvas);draw()}
function renderStrategies(strategies){if(!strategies)return;const b=strategies.big4,s=strategies.scalping;$("big4-name").textContent=b.name;$("big4-equity").textContent=usd(b.equity);performance($("big4-return"),b.return_pct);$("big4-detail").textContent=`${Number(b.actual_allocation_pct).toFixed(1)} % / Ziel ${Number(b.target_allocation_pct).toFixed(1)} % · Regime ${b.regime}`;$("big4-status").textContent=b.status;$("scalp-name").textContent=s.name;$("scalp-equity").textContent=usd(s.equity);performance($("scalp-return"),s.return_pct);$("scalp-detail").textContent=`${Number(s.actual_allocation_pct).toFixed(1)} % / Ziel ${Number(s.target_allocation_pct).toFixed(1)} % · ${s.completed_trades} Trades${s.split_transition?" · Umschichtung läuft":""}`;$("scalp-status").textContent=s.status}
function signedUsd(value){if(value===null||value===undefined)return "–";const n=Number(value);return `${n>0?"+":""}${usd(n)}`}
function duration(seconds){const s=Math.max(0,Number(seconds)||0);if(s<60)return `${Math.floor(s)} s`;if(s<3600)return `${Math.floor(s/60)} min`;return `${Math.floor(s/3600)} h ${Math.floor(s%3600/60)} min`}
let rebalanceTimer;
function renderRebalanceCountdown(big4){clearInterval(rebalanceTimer);const box=$("rebalance-countdown"),at=$("rebalance-at"),target=new Date(big4?.next_rebalance_at);at.textContent=Number.isFinite(target.getTime())?target.toLocaleString("de-CH",{dateStyle:"medium",timeStyle:"short"}):"–";const draw=()=>{if(big4?.split_rebalance_active){box.textContent="Umschichtung laeuft";box.parentElement.classList.add("due");return}const left=target.getTime()-Date.now();if(!Number.isFinite(left)||left<=0){box.textContent="Jetzt faellig";box.parentElement.classList.add("due");return}box.parentElement.classList.remove("due");const total=Math.floor(left/1000),days=Math.floor(total/86400),hours=Math.floor(total%86400/3600),minutes=Math.floor(total%3600/60),seconds=total%60;box.textContent=`${days} T ${String(hours).padStart(2,"0")} Std ${String(minutes).padStart(2,"0")} Min ${String(seconds).padStart(2,"0")} Sek`};draw();rebalanceTimer=setInterval(draw,1000)}
function renderInsights(details,operations,strategies){if(!details||!operations)return;const b=details.big4||{},s=details.scalping||{};$("scalp-stats-name").textContent=strategies?.scalping?.name||"Scalping";$("big4-realized").textContent="–";$("big4-fees").textContent=usd(b.fees_usd||0);$("big4-net").textContent=signedUsd(b.net_pnl_usd);$("scalp-realized").textContent=signedUsd(s.realized_pnl_usd);$("scalp-unrealized").textContent=signedUsd(s.unrealized_pnl_usd);$("scalp-fees").textContent=usd(s.fees_usd||0);$("scalp-net").textContent=signedUsd(s.net_pnl_usd);$("stat-trades").textContent=String(s.completed_trades??0);$("stat-winrate").textContent=s.win_rate_pct==null?"–":pct(s.win_rate_pct);$("stat-avg-win").textContent=s.average_win_usd==null?"–":signedUsd(s.average_win_usd);$("stat-avg-loss").textContent=s.average_loss_usd==null?"–":signedUsd(s.average_loss_usd);$("stat-maker").textContent=s.maker_share_pct==null?"–":pct(s.maker_share_pct);$("stat-maker-taker").textContent=`${s.maker_fills||0} / ${s.taker_fills||0}`;const period=(id,row)=>$(id).textContent=`${signedUsd(row?.pnl_usd||0)} · ${row?.trades||0} Trades`;period("period-24h",s.last_24h);period("period-7d",s.last_7d);period("period-all",s.since_start);const health=(id,textId,row)=>{const dot=$(id);dot.classList.toggle("error",row?.level==="error");$(textId).textContent=row?.status||"–"};health("big4-health","big4-health-text",operations.big4);health("scalp-health","scalp-health-text",operations.scalping);$("api-success").textContent=new Date(operations.last_successful_api_at).toLocaleString("de-CH",{dateStyle:"short",timeStyle:"medium"});const order=operations.scalping?.active_order,box=$("active-order");box.classList.toggle("warning",Boolean(order?.warning));if(order){$("active-order-main").textContent=`${order.side} ${order.type} · ${order.quantity}`;$("active-order-detail").textContent=`Preis ${usd(order.price)} · offen seit ${duration(order.age_seconds)}${order.warning?" · Bitte prüfen":""}`}else{$("active-order-main").textContent="Keine";$("active-order-detail").textContent="–"}$("privacy-note").textContent=operations.privacy||"Nur aggregierte Daten; keine Zugangsdaten."}
function render(data){const p=data.portfolio;updateStatus(data.generated_at,data.bot.mode);$("equity").textContent=money.format(p.equity);$("initial-capital").textContent=usd(p.initial_capital);performance($("return-total"),p.return_total_pct);performance($("return-today"),p.return_today_pct);$("cash").textContent=usd(p.cash);$("exposure").textContent=pct(p.exposure/p.equity*100);$("exposure-usd").textContent=usd(p.exposure);$("drawdown").textContent=pct(p.max_drawdown_pct);const exposure=Math.max(0,Math.min(100,p.exposure/p.equity*100));$("donut").style.setProperty("--value",exposure);$("donut-value").textContent=`${exposure.toFixed(0)} %`;$("allocation-invested").textContent=usd(p.exposure);$("allocation-cash").textContent=usd(p.cash);renderStrategies(data.strategies);renderInsights(data.performance_details,data.operations,data.strategies);renderPositions(data.positions||[]);renderTrades(data.recent_trades||[]);renderChart(data.equity_history||[])}
fetch(`dashboard-data.json?t=${Date.now()}`,{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}).then(data=>{render(data);renderAdaActivity(data)}).catch(error=>{console.error("Dashboard-Daten konnten nicht geladen werden:",error);$("status").classList.add("offline");$("status").querySelector("span").textContent="DATEN NICHT ERREICHBAR"});

// Fallback for a publisher process that was started before countdown.js was added.
fetch(`dashboard-data.json?t=${Date.now()}`,{cache:"no-store"})
  .then(r=>r.json()).then(data=>renderRebalanceCountdown(data.operations?.big4));

function renderStrategyChart(canvasId,tooltipId,valueId,history,markers=[]){
  const canvas=$(canvasId),tip=$(tooltipId),value=$(valueId),ctx=canvas.getContext("2d");
  const rows=history||[];let points=[];
  value.textContent=rows.length?signedUsd(rows.at(-1).value):"–";
  function draw(){
    const ratio=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
    canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
    if(!rows.length)return;
    const pad={top:12,right:12,bottom:25,left:45},values=rows.map(row=>Number(row.value));
    let min=Math.min(0,...values),max=Math.max(0,...values),range=max-min;
    if(!range){range=Math.max(Math.abs(max)*.2,.02);min-=range;max+=range}
    else{const buffer=range*.15;min-=buffer;max+=buffer}
    const x=i=>pad.left+(rows.length===1?.5:i/(rows.length-1))*(w-pad.left-pad.right);
    const y=v=>pad.top+(max-v)/(max-min)*(h-pad.top-pad.bottom);
    const zero=y(0);ctx.strokeStyle="rgba(148,190,177,.18)";ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(pad.left,zero);ctx.lineTo(w-pad.right,zero);ctx.stroke();ctx.setLineDash([]);
    points=rows.map((row,i)=>({x:x(i),y:y(Number(row.value)),item:row}));
    ctx.lineWidth=2.2;ctx.lineJoin="round";
    if(points.length===1){ctx.beginPath();ctx.arc(points[0].x,points[0].y,3.5,0,Math.PI*2);ctx.fillStyle=values[0]>=0?"#3ce5ae":"#ff6b78";ctx.fill()}
    for(let i=1;i<points.length;i++){const positive=(values[i-1]+values[i])/2>=0,color=positive?"#3ce5ae":"#ff6b78";ctx.beginPath();ctx.moveTo(points[i-1].x,points[i-1].y);ctx.lineTo(points[i].x,points[i].y);ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=6;ctx.stroke()}ctx.shadowBlur=0;
    const last=points.at(-1);ctx.beginPath();ctx.arc(last.x,last.y,3.5,0,Math.PI*2);ctx.fillStyle=values.at(-1)>=0?"#3ce5ae":"#ff6b78";ctx.fill();
    markers.forEach(marker=>{const stamp=new Date(marker.time).getTime(),index=rows.reduce((best,row,i)=>Math.abs(new Date(row.time).getTime()-stamp)<Math.abs(new Date(rows[best].time).getTime()-stamp)?i:best,0),p=points[index];if(!p)return;ctx.beginPath();if(marker.type==="buy"){ctx.moveTo(p.x,p.y-8);ctx.lineTo(p.x-5,p.y-1);ctx.lineTo(p.x+5,p.y-1)}else if(marker.type==="stop"){ctx.moveTo(p.x,p.y+8);ctx.lineTo(p.x-5,p.y+1);ctx.lineTo(p.x+5,p.y+1)}else{ctx.arc(p.x,p.y,4,0,Math.PI*2)}ctx.closePath();ctx.fillStyle=marker.type==="buy"?"#5dc9ff":marker.type==="stop"?"#ffbd5a":"#f1f8f5";ctx.fill()});
    ctx.fillStyle="#78978e";ctx.font="10px system-ui";ctx.textAlign="center";ctx.textBaseline="top";
    [0,rows.length-1].forEach(i=>ctx.fillText(new Date(rows[i].time).toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"}),x(i),h-pad.bottom+9));
  }
  canvas.addEventListener("pointermove",event=>{if(!points.length)return;const rect=canvas.getBoundingClientRect(),mx=event.clientX-rect.left,nearest=points.reduce((a,b)=>Math.abs(b.x-mx)<Math.abs(a.x-mx)?b:a);tip.hidden=false;tip.style.left=`${nearest.x}px`;tip.style.top=`${nearest.y}px`;tip.innerHTML=`<b>${signedUsd(nearest.item.value)}</b><br>${new Date(nearest.item.time).toLocaleString("de-CH",{dateStyle:"medium",timeStyle:"short"})}`});
  canvas.addEventListener("pointerleave",()=>tip.hidden=true);new ResizeObserver(draw).observe(canvas);draw();
}

fetch(`dashboard-data.json?t=${Date.now()}`,{cache:"no-store"}).then(r=>r.json()).then(data=>{
  renderStrategyChart("big4-chart","big4-chart-tooltip","big4-chart-value",data.strategy_history?.big4);
  renderStrategyChart("scalp-chart","scalp-chart-tooltip","scalp-chart-value",data.ada_activity?data.strategy_history?.scalping:[],data.ada_activity?data.strategy_markers?.scalping||[]:[]);
});
