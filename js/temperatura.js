/* =====================================================================
   TEMPERATURA DAS CÂMARAS (13/10/2026) — um quadro por empresa
   ---------------------------------------------------------------------
   Nasceu da planilha dela "Controle de Temperatura das Câmaras Frias".
   Pedido: "algo muito bom e automático", "me lembre de fazer a checagem
   de 15 em 15 ou toda semana", "me lembre de fazer isso e imprimir".

   TRÊS TIPOS DE FICHA (todas viajam pela nuvem, como compras):
   | tmpc   | uma câmara: piso, nº, setor, conservação, faixa mín/máx    |
   | tmpm   | uma medição: data, horas, leituras {uid da câmara:{m,t}}   |
   | tmpcfg | a frequência da loja (todo dia, 7, 15 ou 30 dias)          |
   A leitura é guardada pelo uid da câmara, nunca pela posição.

   REGRA DO RISCO (a mesma da planilha, para ela conferir):
   - alguma leitura passa 2 °C da faixa (para cima ou para baixo) → ALTO
   - manhã E tarde fora da faixa → ALTO
   - só uma das duas fora → MÉDIO
   - as duas dentro → ZERO
   ===================================================================== */

const TMP_FREQS=[1,7,15,30];   /* 1 = todo dia (o que a fiscalização costuma pedir) */
const TMP_FREQ_PADRAO=15;
const TMP_RISCO={
  zero: {rot:"Risco zero",  cls:"bd-selo-ok"},
  medio:{rot:"Risco médio", cls:"bd-selo-atencao"},
  alto: {rot:"Risco alto",  cls:"bd-selo-erro"},
  off:  {rot:"Desativada",  cls:"bd-selo-neutro"},
  vazio:{rot:"Sem leitura", cls:"bd-selo-neutro"}
};

let TMP_VISTA="medicao";      /* "medicao" ou "camaras" */
let TMP_ABERTA=null;          /* uid da medição na tela (null = a mais recente) */
let TMP_EDIT_CAM=null;        /* id da câmara com o formulário aberto */
let TMP_HIST_TODAS=false;

/* ---- leitura dos dados ---- */
function tmpCmpPiso(a,b){ return String(b||"").localeCompare(String(a||""),"pt",{numeric:true}); }
function tmpCamaras(loja){
  loja=loja||currentStore;
  return DATA.filter(d=>!d.deleted&&d.tipo==="tmpc"&&d.loja===loja)
    .sort((a,b)=>tmpCmpPiso(a.piso,b.piso)||(Number(a.num)||0)-(Number(b.num)||0));
}
function tmpMedicoes(loja){
  loja=loja||currentStore;
  return DATA.filter(d=>!d.deleted&&d.tipo==="tmpm"&&d.loja===loja)
    .sort((a,b)=>String(b.data).localeCompare(String(a.data))||String(b.mod).localeCompare(String(a.mod)));
}
function tmpCfg(loja){
  loja=loja||currentStore;
  return DATA.find(d=>!d.deleted&&d.tipo==="tmpcfg"&&d.loja===loja)||null;
}
function tmpFreqTxt(f){ return Number(f)===1?"todo dia":"a cada "+f+" dias"; }
function tmpFreq(loja){ const c=tmpCfg(loja); return (c&&TMP_FREQS.includes(Number(c.freq)))?Number(c.freq):TMP_FREQ_PADRAO; }

/* a situação da loja: o que alimenta todos os lembretes */
function tmpEstado(loja){
  loja=loja||currentStore;
  const cams=tmpCamaras(loja).filter(c=>c.ativa!==false);
  const meds=tmpMedicoes(loja);
  const ultima=meds[0]||null;
  const freq=tmpFreq(loja);
  const proxima=ultima?ctlMaisDias(ultima.data,freq):(cams.length?ctlHoje():"");
  const dias=proxima?ctlDias(ctlHoje(),proxima):0;
  /* falta imprimir: a medição mais recente que tem leitura e não foi impressa */
  const naoImpressa=meds.find(m=>!m.impresso&&tmpTemLeitura(m))||null;
  return {camaras:cams.length,ultima,proxima,dias,freq,naoImpressa};
}
function tmpTemLeitura(m){
  const l=m&&m.leituras||{};
  return Object.keys(l).some(k=>l[k]&&(l[k].m!==""&&l[k].m!==undefined||l[k].t!==""&&l[k].t!==undefined));
}

/* ---- o risco ---- */
function tmpRisco(cam,leit){
  if(cam.ativa===false)return "off";
  const vals=[ctlNum(leit&&leit.m),ctlNum(leit&&leit.t)].filter(v=>v!=="");
  if(!vals.length)return "vazio";
  const min=Number(cam.min),max=Number(cam.max);
  const fora=v=>v<min||v>max;
  if(vals.some(v=>v>max+2||v<min-2))return "alto";
  const nFora=vals.filter(fora).length;
  if(nFora>=2)return "alto";
  if(nFora===1)return "medio";
  return "zero";
}
function tmpForaDaFaixa(m,loja){
  const l=m&&m.leituras||{};
  return tmpCamaras(loja).filter(c=>{const r=tmpRisco(c,l[c.uid]);return r==="alto"||r==="medio";}).length;
}
function tmpFaixaTxt(c){
  if(ctlNum(c.min)===""||ctlNum(c.max)==="")return "sem faixa";
  return ctlNumBr(c.min,0)+" a "+ctlNumBr(c.max,0)+" °C";
}

/* ===================================================================== tela */
function renderTemperatura(){
  const el=document.getElementById("tab-tmp");if(!el)return;
  const loja=ctlLojaNome();
  const cams=tmpCamaras(), meds=tmpMedicoes(), e=tmpEstado();
  let med=TMP_ABERTA?meds.find(m=>m.uid===TMP_ABERTA):null;
  if(!med){med=meds[0]||null;TMP_ABERTA=med?med.uid:null;}

  /* o lembrete, escrito: quando medir e se falta imprimir */
  let aviso="";
  if(!cams.length) aviso="";
  else if(!e.ultima) aviso=tmpAviso("atencao","⚠","Nenhuma medição ainda","Toque em “Nova medição” para lançar a primeira.");
  else if(e.dias<0) aviso=tmpAviso("erro","✕","Medição atrasada há "+(-e.dias)+" dia"+(e.dias===-1?"":"s"),
      "A última foi em "+ctlBr(e.ultima.data)+". Você mede "+tmpFreqTxt(e.freq)+".");
  else if(e.dias<=2) aviso=tmpAviso("atencao","⚠",e.dias===0?"Dia de medir: hoje":"Medir até "+ctlBr(e.proxima),
      "A última foi em "+ctlBr(e.ultima.data)+".");
  else aviso=tmpAviso("ok","✓","Em dia","Próxima medição em "+ctlBr(e.proxima)+" (faltam "+e.dias+" dias).");
  if(e.naoImpressa) aviso+=`<div class="bd-aviso bd-aviso-info ctl-aviso"><span class="bd-aviso-ico">i</span>
      <div><b>Falta imprimir a medição de ${ctlBr(e.naoImpressa.data)}</b>
      <button class="bd-btn bd-btn-suave bd-btn-p ctl-aviso-btn" onclick="tmpImprimir('${e.naoImpressa.uid}')">Imprimir agora</button></div></div>`;

  const fora=med?tmpForaDaFaixa(med):0;
  el.innerHTML=`
    <div class="ctl-capa">
      <div class="ctl-capa-et">Controle de temperatura</div>
      <div class="ctl-capa-tit">${esc(loja)}</div>
      <div class="ctl-capa-sub">Câmaras frias: medição de manhã e à tarde, com o risco calculado na hora</div>
    </div>
    ${aviso}
    <div class="bd-kpis ctl-nums">
      <div class="bd-kpi"><div class="bd-kpi-nome">Última medição</div>
        <div class="bd-kpi-num">${e.ultima?ctlBrCurta(e.ultima.data):"—"}</div></div>
      <div class="bd-kpi"><div class="bd-kpi-nome">Próxima</div>
        <div class="bd-kpi-num">${e.proxima&&cams.length?ctlBrCurta(e.proxima):"—"}</div></div>
      <div class="bd-kpi"><div class="bd-kpi-nome">Câmaras em uso</div>
        <div class="bd-kpi-num">${e.camaras}</div></div>
      <div class="bd-kpi"><div class="bd-kpi-nome">Fora da faixa</div>
        <div class="bd-kpi-num">${med?fora:"—"}</div>
        <div class="bd-kpi-obs">${med?"na medição de "+ctlBrCurta(med.data):""}</div></div>
    </div>
    <div class="ctl-barra">
      <button class="bd-btn bd-btn-principal" onclick="tmpNova()">+ Nova medição</button>
      <button class="bd-btn bd-btn-secundario" onclick="tmpVista('${TMP_VISTA==="camaras"?"medicao":"camaras"}')"
        aria-pressed="${TMP_VISTA==="camaras"}">${TMP_VISTA==="camaras"?"Voltar às medições":"Câmaras ("+cams.length+")"}</button>
      <label class="ctl-freq">Medir
        <select class="bd-campo" onchange="tmpSalvarFreq(this.value)" aria-label="De quantos em quantos dias medir">
          ${TMP_FREQS.map(f=>`<option value="${f}"${e.freq===f?" selected":""}>${tmpFreqTxt(f)}</option>`).join("")}
        </select></label>
    </div>
    <div id="tmp-corpo"></div>`;
  tmpRenderCorpo(med);
}
function tmpAviso(tipo,ico,tit,txt){
  return `<div class="bd-aviso bd-aviso-${tipo} ctl-aviso"><span class="bd-aviso-ico">${ico}</span>
    <div><b>${esc(tit)}</b>${esc(txt)}</div></div>`;
}
function tmpVista(v){TMP_VISTA=v;TMP_EDIT_CAM=null;renderTemperatura();}

function tmpRenderCorpo(med){
  const box=document.getElementById("tmp-corpo");if(!box)return;
  if(TMP_VISTA==="camaras"){box.innerHTML=tmpCamarasHTML();return;}
  const cams=tmpCamaras();
  if(!cams.length){
    box.innerHTML=`<div class="bd-vazio"><div class="bd-vazio-ico">❄</div>
      <div class="bd-vazio-tit">Nenhuma câmara cadastrada nesta loja</div>
      <div class="bd-vazio-txt">Cadastre as câmaras uma vez. Depois, cada medição já vem com todas elas na lista.</div>
      <button class="bd-btn bd-btn-secundario" onclick="tmpVista('camaras')">Cadastrar câmaras</button></div>`;
    return;
  }
  if(!med){
    box.innerHTML=`<div class="bd-vazio"><div class="bd-vazio-ico">🌡</div>
      <div class="bd-vazio-tit">Nenhuma medição lançada</div>
      <div class="bd-vazio-txt">Toque em “Nova medição”: as ${cams.length} câmaras já aparecem prontas para digitar.</div></div>`;
    return;
  }
  box.innerHTML=tmpMedicaoHTML(med,cams)+tmpHistoricoHTML(med);
}

/* ---- a medição aberta ---- */
function tmpMedicaoHTML(med,cams){
  const meds=tmpMedicoes();
  const anterior=meds.find(m=>m.data<med.data)||null;
  const l=med.leituras||{};
  const porPiso={};
  cams.forEach(c=>(porPiso[c.piso||"Sem piso"]=porPiso[c.piso||"Sem piso"]||[]).push(c));
  let linhas="";
  Object.keys(porPiso).sort(tmpCmpPiso).forEach(p=>{
    const lista=porPiso[p].slice().sort((a,b)=>(a.ativa===false)-(b.ativa===false)||(Number(a.num)||0)-(Number(b.num)||0));
    linhas+=`<div class="ctl-piso">${esc(p)}</div>`;
    lista.forEach(c=>{
      const r=tmpRisco(c,l[c.uid]), R=TMP_RISCO[r];
      const off=c.ativa===false;
      const ant=anterior&&anterior.leituras&&anterior.leituras[c.uid];
      const antTxt=ant&&(ant.m!==""||ant.t!=="")?`Antes (${ctlBrCurta(anterior.data)}): ${ctlNumBr(ant.m)||"—"} / ${ctlNumBr(ant.t)||"—"}`:"";
      linhas+=`<div class="tmp-lin${off?" tmp-off":""}" data-cam="${esc(c.uid)}">
        <div class="tmp-id" title="Número da câmara">${esc(String(c.num||"—"))}</div>
        <div class="tmp-area"><b>${esc(c.secao||"")}</b> ${esc(c.conserva||"")}
          <small>${tmpFaixaTxt(c)}${c.obs?" · "+esc(c.obs):""}</small>
          ${antTxt?`<small class="tmp-ant">${esc(antTxt)}</small>`:""}</div>
        ${off?`<div class="tmp-leits"><span class="tmp-desat">Câmara desativada</span></div>`:
        `<div class="tmp-leits">
          <label class="tmp-leit"><span>Manhã</span><input class="bd-campo" inputmode="decimal" autocomplete="off"
            value="${esc(ctlNumBr(l[c.uid]&&l[c.uid].m))}" aria-label="Manhã, câmara ${esc(String(c.num))}"
            oninput="tmpAoDigitar(this)" onchange="tmpLeitura('${med.uid}','${c.uid}','m',this.value)"></label>
          <label class="tmp-leit"><span>Tarde</span><input class="bd-campo" inputmode="decimal" autocomplete="off"
            value="${esc(ctlNumBr(l[c.uid]&&l[c.uid].t))}" aria-label="Tarde, câmara ${esc(String(c.num))}"
            oninput="tmpAoDigitar(this)" onchange="tmpLeitura('${med.uid}','${c.uid}','t',this.value)"></label>
        </div>`}
        <span class="bd-selo ${R.cls} tmp-risco"><i></i>${R.rot}</span>
      </div>`;
    });
  });
  return `<div class="bd-card ctl-bloco">
    <div class="tmp-cab">
      <label class="ctl-rot">Data<input type="date" class="bd-campo" value="${esc(med.data)}"
        onchange="tmpCampo('${med.uid}','data',this.value)"></label>
      <label class="ctl-rot">Hora da manhã<input type="time" class="bd-campo" value="${esc(med.horaM||"")}"
        onchange="tmpCampo('${med.uid}','horaM',this.value)"></label>
      <label class="ctl-rot">Hora da tarde<input type="time" class="bd-campo" value="${esc(med.horaT||"")}"
        onchange="tmpCampo('${med.uid}','horaT',this.value)"></label>
      <label class="ctl-rot ctl-rot-largo">Quem mediu<input class="bd-campo" value="${esc(med.resp||"")}" autocomplete="off"
        onchange="tmpCampo('${med.uid}','resp',this.value)"></label>
    </div>
    <div class="tmp-lista">${linhas}</div>
    <label class="ctl-rot ctl-obs">Observações desta medição<textarea class="bd-campo" rows="2"
      onchange="tmpCampo('${med.uid}','obs',this.value)">${esc(med.obs||"")}</textarea></label>
    <div class="ctl-pe">
      <span class="ctl-pe-txt">${med.impresso?"Impressa em "+ctlBr(med.impresso):"Ainda não impressa"} · salva sozinha enquanto você digita</span>
      <span class="ctl-pe-btns">
        <button class="bd-btn bd-btn-secundario" onclick="tmpImprimir('${med.uid}')">Imprimir / PDF</button>
        <button class="bd-btn bd-btn-fantasma" onclick="tmpExcluir('${med.uid}')">Excluir medição</button>
      </span>
    </div>
    <p class="ctl-regra"><b>Como o risco é calculado:</b> passou 2 °C da faixa, ou manhã e tarde fora da faixa = risco alto ·
      só uma das duas fora = risco médio · as duas dentro = risco zero.</p>
  </div>`;
}

/* ---- as medições anteriores ---- */
function tmpHistoricoHTML(med){
  const meds=tmpMedicoes();
  if(meds.length<2&&meds[0]===med)return "";
  const lista=TMP_HIST_TODAS?meds:meds.slice(0,8);
  return `<div class="ctl-sec">Medições lançadas</div>
    <div class="bd-card ctl-hist">${lista.map(m=>{
      const f=tmpForaDaFaixa(m);
      return `<button class="ctl-hist-lin${m.uid===med.uid?" ctl-hist-atual":""}" onclick="tmpAbrir('${m.uid}')">
        <b>${ctlBr(m.data)}</b>
        <span class="bd-selo ${f?"bd-selo-atencao":"bd-selo-ok"}"><i></i>${f?f+" fora da faixa":"tudo na faixa"}</span>
        <span class="ctl-hist-imp">${m.impresso?"impressa":"não impressa"}</span></button>`;}).join("")}
    </div>
    <div class="ctl-hist-pe">
      ${meds.length>8?`<button class="bd-btn bd-btn-fantasma" onclick="TMP_HIST_TODAS=!TMP_HIST_TODAS;renderTemperatura()">${TMP_HIST_TODAS?"Ver menos":"Ver todas ("+meds.length+")"}</button>`:""}
      <button class="bd-btn bd-btn-fantasma" onclick="tmpPlanilha()">Baixar planilha (Excel)</button>
    </div>`;
}
function tmpAbrir(uid){TMP_ABERTA=uid;TMP_VISTA="medicao";renderTemperatura();window.scrollTo(0,0);}

/* ---- digitar: o selo do risco muda na hora, e grava ao sair do campo ---- */
function tmpAoDigitar(inp){
  const lin=inp.closest(".tmp-lin");if(!lin)return;
  const cam=DATA.find(d=>d.uid===lin.dataset.cam);if(!cam)return;
  const ins=lin.querySelectorAll("input");
  const r=tmpRisco(cam,{m:ins[0].value,t:ins[1].value}),R=TMP_RISCO[r];
  const s=lin.querySelector(".tmp-risco");
  if(s){s.className="bd-selo "+R.cls+" tmp-risco";s.innerHTML="<i></i>"+R.rot;}
}
async function tmpLeitura(medUid,camUid,quando,valor){
  const m=DATA.find(d=>d.uid===medUid);if(!m)return;
  const v=ctlNum(valor);
  if(String(valor).trim()!==""&&v===""){toast("Digite só o número, por exemplo 4,5 ou -18.");return;}
  m.leituras=m.leituras||{};
  m.leituras[camUid]=Object.assign({m:"",t:""},m.leituras[camUid]||{});
  m.leituras[camUid][quando]=v;
  await ctlGravar(m);
}
async function tmpCampo(uid,campo,valor){
  const m=DATA.find(d=>d.uid===uid);if(!m)return;
  if(campo==="data"&&!valor){toast("A data não pode ficar vazia.");renderTemperatura();return;}
  m[campo]=String(valor).trim();
  await ctlGravar(m);
  if(campo==="data")renderTemperatura();
}
async function tmpNova(){
  const cams=tmpCamaras();
  if(!cams.length){tmpVista("camaras");toast("Cadastre as câmaras primeiro.");return;}
  const hoje=ctlHoje();
  const ja=tmpMedicoes().find(m=>m.data===hoje);
  if(ja&&!confirm("Já existe uma medição de hoje. Criar outra mesmo assim?")){tmpAbrir(ja.uid);return;}
  const ult=tmpMedicoes()[0]||{};
  const o={uid:newUid(),tipo:"tmpm",loja:currentStore,data:hoje,
    horaM:ult.horaM||"11:00",horaT:ult.horaT||"13:00",resp:ult.resp||"",
    leituras:{},impresso:"",obs:"",dataRegistro:today(),relato:today(),criado:"manual"};
  await ctlGravar(o);
  TMP_ABERTA=o.uid;TMP_VISTA="medicao";
  renderTemperatura();
  const p=document.querySelector("#tmp-corpo .tmp-leit input");if(p)p.focus();
  toast("Medição de hoje criada. Digite as temperaturas.");
}
async function tmpExcluir(uid){
  const m=DATA.find(d=>d.uid===uid);if(!m)return;
  if(!confirm("Excluir a medição de "+ctlBr(m.data)+"?\n\nDá para desfazer com Ctrl+Z."))return;
  m.deleted=true;await ctlGravar(m);
  TMP_ABERTA=null;renderTemperatura();toast("Medição excluída");
}
async function tmpSalvarFreq(v){
  let c=tmpCfg();
  if(!c)c={uid:"tmpcfg-"+currentStore,tipo:"tmpcfg",loja:currentStore};
  c.freq=Number(v)||TMP_FREQ_PADRAO;
  await ctlGravar(c);
  renderTemperatura();toast("Lembrete: medir "+tmpFreqTxt(c.freq));
}

/* ===================================================== cadastro das câmaras */
function tmpCamarasHTML(){
  const cams=tmpCamaras();
  const pisos=[...new Set(cams.map(c=>c.piso).filter(Boolean))];
  const linha=c=>{
    if(TMP_EDIT_CAM===c.id)return tmpCamForm(c,pisos);
    return `<div class="tmp-cam${c.ativa===false?" tmp-off":""}">
      <div class="tmp-id">${esc(String(c.num||"—"))}</div>
      <div class="tmp-area"><b>${esc(c.secao||"")}</b> ${esc(c.conserva||"")}
        <small>${esc(c.piso||"")} · ${tmpFaixaTxt(c)}${c.obs?" · "+esc(c.obs):""}</small></div>
      ${c.ativa===false?`<span class="bd-selo bd-selo-neutro"><i></i>Desativada</span>`:`<span class="bd-selo bd-selo-ok"><i></i>Em uso</span>`}
      <button class="bd-btn bd-btn-fantasma" onclick="TMP_EDIT_CAM=${c.id};tmpRenderCorpo()" aria-label="Editar câmara ${esc(String(c.num))}">Editar</button>
    </div>`;
  };
  return `<div class="bd-card ctl-bloco">
    <p class="ctl-ajuda">Cadastre cada câmara uma vez. A faixa (mínima e máxima) é o que o site usa para calcular o risco.
      Câmara parada fica <b>desativada</b>: continua na folha, sem pedir temperatura.</p>
    ${cams.map(linha).join("")||`<div class="ctl-ajuda">Nenhuma câmara ainda.</div>`}
    <div class="ctl-pe"><span></span><span class="ctl-pe-btns">
      <button class="bd-btn bd-btn-secundario" onclick="tmpCamNova()">+ Câmara</button></span></div>
  </div>`;
}
function tmpCamForm(c,pisos){
  return `<div class="tmp-camform">
    <label class="ctl-rot">Nº<input id="tcf-num" class="bd-campo" inputmode="numeric" value="${esc(String(c.num||""))}"></label>
    <label class="ctl-rot">Piso<input id="tcf-piso" class="bd-campo" list="tcf-pisos" value="${esc(c.piso||"")}">
      <datalist id="tcf-pisos">${pisos.map(p=>`<option value="${esc(p)}">`).join("")}</datalist></label>
    <label class="ctl-rot">Setor<input id="tcf-secao" class="bd-campo" value="${esc(c.secao||"")}" placeholder="ex.: C&amp;A"></label>
    <label class="ctl-rot ctl-rot-largo">O que guarda<input id="tcf-cons" class="bd-campo" value="${esc(c.conserva||"")}" placeholder="ex.: ESTOQUE 1"></label>
    <label class="ctl-rot">Mínima °C<input id="tcf-min" class="bd-campo" inputmode="decimal" value="${esc(ctlNumBr(c.min,0))}"></label>
    <label class="ctl-rot">Máxima °C<input id="tcf-max" class="bd-campo" inputmode="decimal" value="${esc(ctlNumBr(c.max,0))}"></label>
    <label class="ctl-rot ctl-rot-largo">Observação<input id="tcf-obs" class="bd-campo" value="${esc(c.obs||"")}"></label>
    <label class="bd-check-linha ctl-check"><input type="checkbox" id="tcf-ativa" ${c.ativa===false?"":"checked"}> Câmara em uso</label>
    <div class="ctl-pe-btns ctl-form-btns">
      <button class="bd-btn bd-btn-principal" onclick="tmpCamSalvar(${c.id})">Salvar</button>
      <button class="bd-btn bd-btn-secundario" onclick="TMP_EDIT_CAM=null;tmpRenderCorpo()">Cancelar</button>
      <button class="bd-btn bd-btn-fantasma" onclick="tmpCamExcluir(${c.id})">Excluir</button>
    </div></div>`;
}
async function tmpCamNova(){
  const cams=tmpCamaras();
  const maior=cams.reduce((m,c)=>Math.max(m,Number(c.num)||0),0);
  const o={uid:newUid(),tipo:"tmpc",loja:currentStore,piso:(cams[0]||{}).piso||"1º PISO",
    num:maior+1,secao:"",conserva:"",min:0,max:4,ativa:true,obs:"",criado:"manual"};
  await ctlGravar(o);
  TMP_EDIT_CAM=o.id;renderTemperatura();
  const p=document.getElementById("tcf-secao");if(p)p.focus();
}
async function tmpCamSalvar(id){
  const c=DATA.find(d=>d.id===id);if(!c)return;
  const v=k=>document.getElementById(k).value.trim();
  const min=ctlNum(v("tcf-min")),max=ctlNum(v("tcf-max"));
  if(min===""||max===""){toast("Preencha a temperatura mínima e a máxima.");return;}
  if(min>max){toast("A mínima precisa ser menor que a máxima.");return;}
  Object.assign(c,{num:Number(v("tcf-num"))||v("tcf-num"),piso:v("tcf-piso"),secao:v("tcf-secao"),
    conserva:v("tcf-cons"),min,max,obs:v("tcf-obs"),ativa:document.getElementById("tcf-ativa").checked});
  await ctlGravar(c);
  TMP_EDIT_CAM=null;renderTemperatura();toast("Câmara salva ✓");
}
async function tmpCamExcluir(id){
  const c=DATA.find(d=>d.id===id);if(!c)return;
  if(!confirm("Excluir a câmara "+(c.num||"")+" ("+(c.secao||"")+" "+(c.conserva||"")+")?\n\nSe ela só está parada, prefira desmarcar “Câmara em uso”."))return;
  c.deleted=true;await ctlGravar(c);
  TMP_EDIT_CAM=null;renderTemperatura();toast("Câmara excluída");
}

/* ============================================================== imprimir */
function tmpFolha(med,branco){
  const cams=tmpCamaras();
  const l=(med&&med.leituras)||{};
  const iso=ctlHoje();
  const porPiso={};
  cams.forEach(c=>(porPiso[c.piso||"Sem piso"]=porPiso[c.piso||"Sem piso"]||[]).push(c));
  let corpo="";
  Object.keys(porPiso).sort(tmpCmpPiso).forEach(p=>{
    corpo+=`<tr class="pis pc"><td colspan="7">${esc(p)}</td></tr>`;
    porPiso[p].forEach(c=>{
      const off=c.ativa===false;
      const r=branco?(off?"off":"vazio"):tmpRisco(c,l[c.uid]);
      const R=TMP_RISCO[r];
      const val=q=>off?"—":(branco?"":esc(ctlNumBr(l[c.uid]&&l[c.uid][q])));
      corpo+=`<tr class="${off?"off":""}">
        <td class="n">${esc(String(c.num||""))}</td>
        <td><b>${esc(c.secao||"")}</b> ${esc(c.conserva||"")}${c.obs?`<i>${esc(c.obs)}</i>`:""}</td>
        <td class="c">${tmpFaixaTxt(c)}</td>
        <td class="v">${val("m")}</td><td class="v">${val("t")}</td>
        <td class="c"><span class="rs rs-${r} pc">${branco&&!off?"":esc(R.rot)}</span></td>
        <td class="ac"></td></tr>`;
    });
  });
  const css=ctlFolhaCss(false)+`
    th{font-size:8px;text-transform:uppercase;letter-spacing:.8px;color:#fff;background:#1d6b57;
      padding:5px 6px;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    td{padding:6px;border-bottom:1px solid #eaecf0;vertical-align:middle;font-size:11px}
    td i{display:block;font-style:normal;font-size:9px;color:#667085}
    td.n{width:9mm;text-align:center;font-weight:700;color:#155244}
    td.c{text-align:center;white-space:nowrap}
    td.v{width:20mm;text-align:center;font-size:13px;font-weight:700;color:#1d2939;border-left:1px solid #eaecf0}
    td.ac{width:38mm;border-left:1px solid #eaecf0}
    tr.pis td{background:#e8f5f0;color:#155244;font-weight:700;font-size:10px;letter-spacing:.8px;
      text-transform:uppercase;border-left:3px solid #1d6b57;padding:4px 8px}
    tr.off td{color:#98a2b3}
    .rs{display:inline-block;font-size:9px;font-weight:700;padding:1px 7px;border-radius:99px;border:1px solid transparent}
    .rs-zero{background:#e8f5ee;border-color:#9fd3b5;color:#14653f}
    .rs-medio{background:#fdf1e3;border-color:#eab676;color:#8a5216}
    .rs-alto{background:#fef3f2;border-color:#f3b4ae;color:#b42318}
    .rs-off{background:#f2f4f7;border-color:#d0d5dd;color:#475467}
    .rs-vazio{border-color:#d0d5dd;min-width:22mm;min-height:14px}
    .obs{margin-top:10px;font-size:10.5px;background:#f2f4f7;border-radius:6px;padding:6px 9px;white-space:pre-wrap}`;
  const faixa=[["Loja",currentStore],["Data",branco?"____/____/______":ctlBr(med.data)],
    ["Manhã",branco?"____:____":(med.horaM||"—")],["Tarde",branco?"____:____":(med.horaT||"—")]];
  const ativas=cams.filter(c=>c.ativa!==false).length;
  const html=`<div class="folha">
    ${ctlFolhaCapa("Controle de temperatura · "+String(ctlLojaNome()).split(/\s+[–—·-]\s+/)[0],
      "Temperatura das Câmaras Frias",[["Emitido em",ctlBr(iso)],["Câmaras",String(ativas)]],faixa)}
    <table><thead><tr class="pc"><th>Nº</th><th>Câmara</th><th style="text-align:center">Faixa</th>
      <th style="text-align:center">Manhã °C</th><th style="text-align:center">Tarde °C</th>
      <th style="text-align:center">Situação</th><th>Ação corretiva</th></tr></thead>
    <tbody>${corpo}</tbody></table>
    ${!branco&&med.obs?`<div class="obs pc"><b>Observações:</b> ${esc(med.obs)}</div>`:""}
    <div class="leg"><b>Como o risco é calculado:</b> passou 2 °C da faixa, ou manhã e tarde fora da faixa = <b>risco alto</b> ·
      só uma das duas fora = <b>risco médio</b> · as duas dentro = <b>risco zero</b>.
      Fora da faixa: anotar a ação corretiva e medir de novo.</div>
    <div class="ass"><div>${esc(branco?"Quem mediu":(med.resp||"Quem mediu"))}</div>
      <div>${esc((typeof RT_INFO!=="undefined"&&RT_INFO)||"Responsável Técnica")}</div></div>
  </div>`;
  const nome=typeof nomePadrao==="function"?nomePadrao("TMP",branco?iso:med.data,["Temperatura das Camaras"]):"Temperatura";
  return ctlAbrirFolha(nome,css,html);
}
async function tmpImprimir(uid){
  const m=DATA.find(d=>d.uid===uid);if(!m)return;
  if(!tmpFolha(m,false))return;
  /* imprimiu: o lembrete de imprimir some sozinho */
  if(!m.impresso){m.impresso=ctlHoje();await ctlGravar(m);renderTemperatura();}
}

/* planilha para abrir no Excel: uma linha por câmara e por medição */
function tmpPlanilha(){
  const cams=tmpCamaras(),linhas=[["Data","Manhã","Tarde","Piso","Nº","Setor","Câmara","Mínima","Máxima","Leitura manhã","Leitura tarde","Risco","Impressa"]];
  tmpMedicoes().slice().reverse().forEach(m=>cams.forEach(c=>{
    const l=(m.leituras||{})[c.uid]||{};
    linhas.push([ctlBr(m.data),m.horaM||"",m.horaT||"",c.piso||"",c.num||"",c.secao||"",c.conserva||"",
      ctlNumBr(c.min,0),ctlNumBr(c.max,0),ctlNumBr(l.m),ctlNumBr(l.t),TMP_RISCO[tmpRisco(c,l)].rot,m.impresso?ctlBr(m.impresso):""]);
  }));
  ctlBaixarPlanilha("Temperatura das Camaras - "+currentStore,linhas);
}

/* nenhuma destas fichas é "pendência" no sentido das outras abas: o lembrete
   mora em tmpEstado (cartão do Sumário, capa e agenda) */
if(typeof STATUS_FNS!=="undefined"){
  const nunca={isPend:()=>false,isDone:()=>false};
  STATUS_FNS.tmpc=nunca;STATUS_FNS.tmpm=nunca;STATUS_FNS.tmpcfg=nunca;
}
