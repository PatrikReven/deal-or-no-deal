// Gold "Deal" board — brez bankirja.
// Flow: izberi 1 case -> odpri ostale -> na koncu reveal tvojega.

const MONEY_26 = [
    0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750,
    1000, 5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 400000, 500000, 1000000
  ];
  
  const $ = (id) => document.getElementById(id);
  
  const ui = {
    btnNew: $("btnNew"),
    btnHelp: $("btnHelp"),
  
    moneyLeft: $("moneyLeft"),
    moneyRight: $("moneyRight"),
  
    grid: $("grid"),
  
    phase: $("phase"),
    hint: $("hint"),
  
    yourNum: $("yourNum"),
    miniYourNum: $("miniYourNum"),
  
    openedCount: $("openedCount"),
    leftCount: $("leftCount"),
  
    bottomMsg: $("bottomMsg"),
  
    helpBack: $("helpBack"),
    helpModal: $("helpModal"),
  
    endBack: $("endBack"),
    endModal: $("endModal"),
    endMoney: $("endMoney"),
    endLine: $("endLine"),
    btnAgain: $("btnAgain"),
  
    toast: $("toast"),
  };
  
  let state = null;
  let busy = false;
  
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
  
  function shuffle(arr){
    const a = arr.slice();
    for (let i=a.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  
  function fmtUSD(x){
    if (x < 1) return `$${x.toFixed(2)}`;
    return x.toLocaleString("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 });
  }
  
  function toast(msg){
    ui.toast.textContent = msg;
    ui.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>ui.toast.classList.remove("show"), 1200);
  }
  
  /* Modals */
  function openHelp(){
    ui.helpBack.classList.add("show");
    ui.helpModal.classList.add("show");
    ui.helpBack.setAttribute("aria-hidden","false");
    ui.helpModal.setAttribute("aria-hidden","false");
  }
  function closeHelp(){
    ui.helpBack.classList.remove("show");
    ui.helpModal.classList.remove("show");
    ui.helpBack.setAttribute("aria-hidden","true");
    ui.helpModal.setAttribute("aria-hidden","true");
  }
  function openEnd(){
    ui.endBack.classList.add("show");
    ui.endModal.classList.add("show");
    ui.endBack.setAttribute("aria-hidden","false");
    ui.endModal.setAttribute("aria-hidden","false");
  }
  function closeEnd(){
    ui.endBack.classList.remove("show");
    ui.endModal.classList.remove("show");
    ui.endBack.setAttribute("aria-hidden","true");
    ui.endModal.setAttribute("aria-hidden","true");
  }
  
  function setPhase(text, hint){
    ui.phase.textContent = text;
    ui.hint.textContent = hint;
  }
  
  function buildMoneyColumns(){
    const sorted = MONEY_26.slice().sort((a,b)=>a-b);
    const left = sorted.slice(0, 13);
    const right = sorted.slice(13);
  
    const make = (v) => {
      const li = document.createElement("li");
      li.className = "moneyItem";
      li.dataset.value = String(v);
      li.textContent = fmtUSD(v);
      return li;
    };
  
    ui.moneyLeft.innerHTML = "";
    ui.moneyRight.innerHTML = "";
    left.forEach(v => ui.moneyLeft.appendChild(make(v)));
    right.forEach(v => ui.moneyRight.appendChild(make(v)));
  }
  
  function markGone(v){
    const sel = `.moneyItem[data-value="${CSS.escape(String(v))}"]`;
    const el = document.querySelector(sel);
    if (el) el.classList.add("gone");
  }
  
  function newGame(){
    buildMoneyColumns();
  
    const values = shuffle(MONEY_26);
    const ids = Array.from({length:26}, (_,i)=>i+1); // vedno 1..26
    const cases = ids.map((id, idx)=>({
      id,
      value: values[idx],
      opened: false,
      isPlayer: false
    }));
  
    state = {
      cases,
      phase: "pick", // pick | open | ended
      playerId: null
    };
    busy = false;
  
    ui.yourNum.textContent = "—";
    ui.miniYourNum.textContent = "—";
    ui.openedCount.textContent = "0";
    ui.leftCount.textContent = "26";
    ui.bottomMsg.textContent = "Welcome! Izberi case in začnemo.";
  
    setPhase("Select a case", "Klikni en case, da postane tvoj.");
    render();
    toast("Nova igra 👑");
  }
  
  function render(){
    const opened = state.cases.filter(c=>c.opened).length;
    ui.openedCount.textContent = String(opened);
    ui.leftCount.textContent = String(26 - opened);
  
    ui.grid.innerHTML = "";
  
    for (const c of state.cases){
      const btn = document.createElement("button");
      btn.className = "case";
      btn.type = "button";
  
      if (state.phase === "pick" && !state.playerId) btn.classList.add("pulse");
      if (c.isPlayer) btn.classList.add("chosen");
      if (c.opened) btn.classList.add("opened");
  
      btn.disabled = busy || state.phase === "ended" || c.opened;
      if (state.phase !== "pick" && c.isPlayer) btn.disabled = true;
  
      const shell = document.createElement("div");
      shell.className = "caseShell";
  
      const handle = document.createElement("div");
      handle.className = "handle";
  
      const dL = document.createElement("div");
      dL.className = "door left";
      const dR = document.createElement("div");
      dR.className = "door right";
  
      const seam = document.createElement("div");
      seam.className = "seam";
  
      shell.append(handle, dL, dR, seam);
  
      const num = document.createElement("div");
      num.className = "caseNum";
      num.textContent = String(c.id);
  
      const money = document.createElement("div");
      money.className = "caseMoney";
      money.textContent = c.opened ? fmtUSD(c.value) : "—";
  
      btn.append(shell, num, money);
      btn.addEventListener("click", ()=>onCaseClick(c.id, btn));
  
      ui.grid.appendChild(btn);
    }
  }
  
  async function onCaseClick(id, btnEl){
    if (busy) return;
    const c = state.cases.find(x=>x.id===id);
    if (!c || c.opened) return;
  
    if (state.phase === "pick"){
      state.playerId = id;
      c.isPlayer = true;
      state.phase = "open";
  
      ui.yourNum.textContent = String(id);
      ui.miniYourNum.textContent = String(id);
  
      setPhase("Open the cases", "Odpiraj ostale case. Nagrade se prečrtajo.");
      ui.bottomMsg.textContent = `Tvoj case je #${id}. Zdaj odpiraj ostale.`;
      toast(`Izbran case #${id}`);
      render();
      return;
    }
  
    if (state.phase === "open"){
      if (c.isPlayer) return;
  
      busy = true;
  
      btnEl.classList.add("opening");
      await sleep(560);
  
      c.opened = true;
      markGone(c.value);
  
      busy = false;
      render();
  
      ui.bottomMsg.textContent = `Odprt case #${c.id}: ${fmtUSD(c.value)}`;
  
      const left = state.cases.filter(x=>!x.opened);
      if (left.length === 1 && left[0].isPlayer){
        await endGame();
      }
    }
  }
  
  async function endGame(){
    state.phase = "ended";
    render();
  
    const player = state.cases.find(c=>c.isPlayer);
    const val = player.value;
  
    setPhase("Final reveal", "Razkritje tvoje nagrade.");
    ui.bottomMsg.textContent = `Finale! Tvoj case #${player.id} se razkrije…`;
    toast("Finale…");
  
    await sleep(450);
  
    ui.endMoney.textContent = fmtUSD(val);
    ui.endLine.textContent = `Tvoj case #${player.id} je imel ${fmtUSD(val)}.`;
    openEnd();
  }
  
  /* Wire */
  function wire(){
    ui.btnNew.addEventListener("click", newGame);
    ui.btnHelp.addEventListener("click", openHelp);
  
    ui.helpBack.addEventListener("click", closeHelp);
    ui.endBack.addEventListener("click", closeEnd);
  
    document.addEventListener("click", (e)=>{
      const b = e.target.closest("[data-close]");
      if (!b) return;
      const which = b.getAttribute("data-close");
      if (which === "help") closeHelp();
      if (which === "end") closeEnd();
    });
  
    ui.btnAgain.addEventListener("click", ()=>{
      closeEnd();
      newGame();
    });
  
    document.addEventListener("keydown", (e)=>{
      if (e.key === "Escape"){
        closeHelp();
        closeEnd();
      }
    });
  }
  
  wire();
  newGame();
  