/* =====================================================================
   ENTRADA COM E-MAIL E SENHA (Parte 3, 20/09/2026)

   Tela cheia que trava o site até ela entrar. Por baixo usa a MESMA chave
   que a Sincronização (js/nuvem.js) já usa — entrar aqui é só um jeito
   mais fácil de conseguir essa chave, sem digitar endereço nenhum
   (o site e o cofre são o mesmo endereço: location.origin).

   REGRA DE OFFLINE: se já existe uma chave guardada (localStorage ou
   sessionStorage), ela entra na hora, mesmo sem internet — só confere
   por trás, sem travar nada. A trava de verdade só aparece quando não
   tem chave nenhuma guardada ainda, ou quando o servidor diz que a
   sessão acabou.

   Este arquivo carrega ANTES de js/app.js (a primeira linha do boot do
   site chama loginAguardarEntrada() antes de mexer em qualquer dado) e
   ANTES de js/nuvem.js — mas só CHAMA as funções de nuvem.js dentro de
   funções assíncronas, que só rodam depois que a página inteira já
   carregou. Por isso a ordem dos <script> não quebra nada.
   ===================================================================== */

const LOGIN_IDLE_MIN = 20;
let loginUltimaAtividade = Date.now();
let loginAguardandoTimer = null;
let loginVigilanciaLigada = false;

function loginApiBase(){ return location.origin; }
function loginEl(){ return document.getElementById("loginTrava"); }
function loginCorpo(){ return document.getElementById("loginCorpo"); }
function loginVisivel(){ const t=loginEl(); return !!t && t.style.display!=="none"; }

function loginMostrar(html){
  const t=loginEl(); if(!t)return;
  loginCorpo().innerHTML=html;
  t.style.display="flex";
  document.body.style.overflow="hidden";
}
function loginEsconder(){
  const t=loginEl(); if(!t)return;
  t.style.display="none";
  document.body.style.overflow="";
  clearInterval(loginAguardandoTimer);
}

/* ---------------------------------------------------------------------
   TELA 1 — e-mail e senha
   --------------------------------------------------------------------- */
function loginTelaEntrada(msg){
  loginMostrar(
    '<div class="field"><label class="bd-rotulo">E-mail</label>' +
    '<input id="loginEmail" class="bd-campo" type="email" autocomplete="username" placeholder="seu@email.com"></div>' +
    '<div class="field" style="margin-top:10px"><label class="bd-rotulo">Senha</label>' +
    '<input id="loginSenha" class="bd-campo" type="password" autocomplete="current-password" placeholder="Sua senha" ' +
    'onkeydown="if(event.key===\'Enter\'){event.preventDefault();loginEntrar();}"></div>' +
    '<label class="bd-check-linha" style="margin-top:12px">' +
    '<input type="checkbox" id="loginManter" class="bd-check" checked>' +
    '<span class="bd-check-txt">manter conectado</span></label>' +
    '<div class="bd-ajuda" style="margin-top:4px">Só marque no seu computador. Em computador emprestado, desmarque: o celular vai pedir aprovação e nada fica salvo aqui.</div>' +
    '<div id="loginMsg" class="bd-ajuda" style="min-height:18px;margin-top:8px">'+(msg||"")+'</div>' +
    '<button class="bd-btn bd-btn-principal bd-btn-largo bd-btn-g" style="width:100%;margin-top:6px" onclick="loginEntrar()">Entrar</button>' +
    '<div style="text-align:center;margin-top:16px">' +
    '<span class="back-link" style="font-size:12.5px;cursor:pointer" onclick="loginTelaEmergencia()">Perdi o celular, tenho um código de emergência</span></div>'
  );
  setTimeout(()=>{const e=document.getElementById("loginEmail");if(e)e.focus();},50);
}

function loginMsgErro(id,texto){
  const m=document.getElementById(id);
  if(!m)return;
  m.style.color="var(--bd-erro-texto)";
  m.textContent=texto;
}
function loginMsgInfo(id,texto){
  const m=document.getElementById(id);
  if(!m)return;
  m.style.color="var(--bd-c500)";
  m.textContent=texto;
}

async function loginEntrar(){
  const email=(document.getElementById("loginEmail").value||"").trim();
  const senha=document.getElementById("loginSenha").value||"";
  const manter=document.getElementById("loginManter").checked;
  if(!email||!senha){loginMsgErro("loginMsg","Preencha e-mail e senha.");return;}
  loginMsgInfo("loginMsg","Entrando...");
  try{
    const r=await fetch(loginApiBase()+"/api/login",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({email:email,senha:senha,manterConectado:manter})});
    const j=await r.json();
    if(!j.ok){loginMsgErro("loginMsg",j.erro||"E-mail ou senha errados.");return;}
    if(j.entrou){
      const erro=await nuvemConectar(loginApiBase(),j.chave,false);
      if(erro){loginMsgErro("loginMsg",erro);return;}
      loginEntrarComSucesso();
      return;
    }
    loginTelaAguardando(j.aprovacaoId,j.codigo);
  }catch(e){loginMsgErro("loginMsg","Sem internet para entrar agora.");}
}

function loginEntrarComSucesso(){
  loginEsconder();
  loginResetIdle();
  loginIniciarVigilancia();
  toast("Entrou ✓");
  if(window.renderHome)renderHome();
}

/* ---------------------------------------------------------------------
   TELA 2 — esperando aprovação no celular (não marcou "manter conectado")
   --------------------------------------------------------------------- */
function loginTelaAguardando(id,codigo){
  loginMostrar(
    '<p style="font-size:13.5px;color:var(--bd-c700);line-height:1.55">Abra o celular dela e aprove este computador.</p>' +
    '<div style="text-align:center;margin:18px 0">' +
    '<div style="font-size:34px;font-weight:700;letter-spacing:4px;color:var(--bd-verde)">'+codigo+'</div>' +
    '<div class="bd-ajuda" style="margin-top:4px">confira se é o mesmo número que aparece no celular</div></div>' +
    '<div id="loginAguardaMsg" class="bd-ajuda" style="text-align:center">Esperando aprovação…</div>' +
    '<button class="bd-btn bd-btn-secundario bd-btn-largo" style="width:100%;margin-top:14px" onclick="loginTelaEntrada()">Cancelar</button>'
  );
  clearInterval(loginAguardandoTimer);
  loginAguardandoTimer=setInterval(function(){loginChecarAprovacao(id);},2500);
  loginChecarAprovacao(id);
}

async function loginChecarAprovacao(id){
  try{
    const r=await fetch(loginApiBase()+"/api/aprovacoes/"+encodeURIComponent(id));
    const j=await r.json();
    if(j.situacao==="aprovada"&&j.chave){
      clearInterval(loginAguardandoTimer);
      const erro=await nuvemConectar(loginApiBase(),j.chave,true);
      if(erro){loginMsgErro("loginAguardaMsg",erro);return;}
      loginEntrarComSucesso();
    }else if(j.situacao==="negada"){
      clearInterval(loginAguardandoTimer);
      loginTelaEntrada("O pedido foi recusado no celular.");
    }else if(j.situacao==="expirada"){
      clearInterval(loginAguardandoTimer);
      loginTelaEntrada("Deu tempo. Peça a entrada de novo.");
    }
  }catch(e){/* sem internet no momento: tenta de novo no próximo tique */}
}

/* ---------------------------------------------------------------------
   TELA 3 — perdi o celular (código de emergência)
   --------------------------------------------------------------------- */
function loginTelaEmergencia(){
  loginMostrar(
    '<p style="font-size:13px;color:var(--bd-c700)">Use um dos 10 códigos impressos no papel de emergência.</p>' +
    '<div class="field" style="margin-top:10px"><label class="bd-rotulo">E-mail</label>' +
    '<input id="loginEmEmail" class="bd-campo" type="email" placeholder="seu@email.com"></div>' +
    '<div class="field" style="margin-top:10px"><label class="bd-rotulo">Código</label>' +
    '<input id="loginEmCodigo" class="bd-campo" placeholder="XXXX-XXXX-XX" style="text-transform:uppercase"></div>' +
    '<div id="loginEmMsg" class="bd-ajuda" style="min-height:18px;margin-top:8px"></div>' +
    '<button class="bd-btn bd-btn-principal bd-btn-largo bd-btn-g" style="width:100%;margin-top:6px" onclick="loginUsarEmergencia()">Entrar com o código</button>' +
    '<div style="text-align:center;margin-top:16px">' +
    '<span class="back-link" style="font-size:12.5px;cursor:pointer" onclick="loginTelaEntrada()">Voltar</span></div>'
  );
}
async function loginUsarEmergencia(){
  const email=(document.getElementById("loginEmEmail").value||"").trim();
  const codigo=(document.getElementById("loginEmCodigo").value||"").trim();
  if(!email||!codigo){loginMsgErro("loginEmMsg","Preencha e-mail e código.");return;}
  loginMsgInfo("loginEmMsg","Conferindo...");
  try{
    const r=await fetch(loginApiBase()+"/api/emergencia/usar",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({email:email,codigo:codigo})});
    const j=await r.json();
    if(!j.ok){loginMsgErro("loginEmMsg",j.erro||"Código inválido.");return;}
    const erro=await nuvemConectar(loginApiBase(),j.chave,false);
    if(erro){loginMsgErro("loginEmMsg",erro);return;}
    loginEntrarComSucesso();
    toast("Entrou com código de emergência ✓ — restam "+j.codigosRestantes+" códigos");
  }catch(e){loginMsgErro("loginEmMsg","Sem internet agora.");}
}

/* ---------------------------------------------------------------------
   TRAVA POR INATIVIDADE (20 minutos) — não desconecta, só pede a senha
   de novo para continuar. Funciona só com internet (confere no servidor).
   --------------------------------------------------------------------- */
function loginResetIdle(){ loginUltimaAtividade=Date.now(); }

function loginTelaTrava(){
  loginMostrar(
    '<p style="font-size:13.5px;color:var(--bd-c700)">Ficou parada um tempo. Digite sua senha para continuar.</p>' +
    '<div class="field" style="margin-top:10px"><label class="bd-rotulo">Senha</label>' +
    '<input id="loginTravaSenha" class="bd-campo" type="password" autocomplete="current-password" ' +
    'onkeydown="if(event.key===\'Enter\'){event.preventDefault();loginDestravar();}"></div>' +
    '<div id="loginTravaMsg" class="bd-ajuda" style="min-height:18px;margin-top:8px"></div>' +
    '<button class="bd-btn bd-btn-principal bd-btn-largo bd-btn-g" style="width:100%;margin-top:6px" onclick="loginDestravar()">Destravar</button>' +
    '<div style="text-align:center;margin-top:16px">' +
    '<span class="back-link" style="font-size:12.5px;cursor:pointer" onclick="loginSair()">Sair (fecha a sessão neste aparelho)</span></div>'
  );
  setTimeout(function(){const e=document.getElementById("loginTravaSenha");if(e)e.focus();},50);
}
async function loginDestravar(){
  const senha=document.getElementById("loginTravaSenha").value||"";
  if(!senha){loginMsgErro("loginTravaMsg","Digite a senha.");return;}
  loginMsgInfo("loginTravaMsg","Conferindo...");
  try{
    const r=await fetch(loginApiBase()+"/api/verificar-senha",{method:"POST",headers:nuvemHdrs(),body:JSON.stringify({senha:senha})});
    const j=await r.json();
    if(!j.ok){loginMsgErro("loginTravaMsg","Senha errada.");return;}
    loginResetIdle();
    loginEsconder();
  }catch(e){loginMsgErro("loginTravaMsg","Sem internet para destravar agora.");}
}
function loginSair(){ nuvemDesconectar(); loginTelaEntrada(); }

/* ---------------------------------------------------------------------
   VIGILÂNCIA: idle de 20min + sessão pode ter expirado no servidor
   (prazo escolhido no celular, ou fim do dia)
   --------------------------------------------------------------------- */
["mousemove","keydown","click","touchstart","scroll"].forEach(function(ev){
  document.addEventListener(ev,loginResetIdle,{passive:true});
});

function loginChecarIdle(){
  if(!nuvemLigada())return;
  if(loginVisivel())return;
  if(Date.now()-loginUltimaAtividade > LOGIN_IDLE_MIN*60000) loginTelaTrava();
}

async function loginChecarSessaoValida(){
  if(!nuvemLigada())return;
  if(loginVisivel())return;
  try{
    const r=await fetch(loginApiBase()+"/api/dispositivos",{headers:nuvemHdrs()});
    if(r.status===401){ nuvemDesconectar(); loginTelaEntrada("A sessão acabou. Entre de novo."); }
  }catch(e){ /* sem internet: continua deixando ela trabalhar offline */ }
}

function loginIniciarVigilancia(){
  if(loginVigilanciaLigada)return;
  loginVigilanciaLigada=true;
  setInterval(loginChecarIdle,30000);
  setInterval(loginChecarSessaoValida,5*60000);
}

/* ---------------------------------------------------------------------
   PORTA DE ENTRADA DO BOOT — js/app.js chama isto como a PRIMEIRA coisa,
   antes de abrir o banco local ou mostrar qualquer tela.
   --------------------------------------------------------------------- */
function loginAguardarEntrada(){
  return new Promise(function(resolve){
    if(!nuvemLigada()){
      loginTelaEntrada();
      const antigo=window.loginEntrarComSucesso;
      window.loginEntrarComSucesso=function(){
        antigo();
        window.loginEntrarComSucesso=antigo;
        resolve();
      };
      return;
    }
    loginEsconder();
    loginIniciarVigilancia();
    resolve();
  });
}
