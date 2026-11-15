(function(){
var $=function(s,r){return (r||document).querySelector(s)},
    $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var TEL='34624321022';

var MENOS=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* capas de tejido: cada una a su velocidad */
(function(){
  if(!document.querySelector('.capas'))return;
  document.documentElement.classList.add('on-load');
  if(MENOS)return;
  var c2=document.querySelector('.c2'),c3=document.querySelector('.c3'),
      c1=document.querySelector('.c1'),y=0,ult=-1;
  addEventListener('scroll',function(){y=scrollY},{passive:true});
  (function bucle(){
    if(y!==ult){
      ult=y;
      if(c1)c1.style.transform='translate3d(0,'+(y*.035).toFixed(1)+'px,0)';
      if(c2)c2.style.transform='translate3d(0,'+(y*.085).toFixed(1)+'px,0)';
      if(c3)c3.style.transform='translate3d(0,'+(-y*.11).toFixed(1)+'px,0) rotate('+(y*.0035).toFixed(3)+'deg)';
    }
    requestAnimationFrame(bucle);
  })();
})();

/* entrada escalonada por bloques */
(function(){
  var grupos=['.split','.tl','.pasos','.team','.mos','.revs','.ccs','.faq','.hor','.bk','.names','.hstats','.opts'];
  var nodos=[];
  grupos.forEach(function(sel){
    [].slice.call(document.querySelectorAll(sel)).forEach(function(g){
      if(g.closest('.hcon'))return;
      g.setAttribute('data-rv','');
      [].slice.call(g.children).forEach(function(h,i){h.style.setProperty('--i',Math.min(i,6))});
      nodos.push(g);
    });
  });
  if(MENOS||!('IntersectionObserver' in window)){
    nodos.forEach(function(g){g.classList.add('in')});return;
  }
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}});
  },{threshold:.04,rootMargin:'0px 0px -60px'});
  nodos.forEach(function(g){io.observe(g)});
})();

/* menu movil */
var bg=$('.burger'),mm=$('.mm');
if(bg&&mm){
  bg.addEventListener('click',function(){
    var o=bg.getAttribute('aria-expanded')!=='true';
    bg.setAttribute('aria-expanded',o);mm.classList.toggle('on',o);
    mm.setAttribute('aria-hidden',!o);document.body.style.overflow=o?'hidden':'';
  });
  $$('.mm a').forEach(function(a){a.addEventListener('click',function(){
    if(bg.getAttribute('aria-expanded')==='true')bg.click();
  })});
}

/* horario en vivo. lunes=0 ... domingo=6, tramos en minutos */
var H=[[540,840,960,1200],[540,840,960,1200],[540,840,960,1200],[540,840,960,1200],[540,840,960,1200],null,null];
var DIAS=['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
function hhmm(m){var h=Math.floor(m/60),x=m%60;return h+':'+(x<10?'0':'')+x}

function estado(){
  var d=new Date(),wd=(d.getDay()+6)%7,m=d.getHours()*60+d.getMinutes(),h=H[wd];
  if(h){
    if(m>=h[0]&&m<h[1])return{ab:true,txt:'Abierto hasta las '+hhmm(h[1])};
    if(m>=h[2]&&m<h[3])return{ab:true,txt:'Abierto hasta las '+hhmm(h[3])};
    if(m<h[0])return{ab:false,txt:'Abre hoy a las '+hhmm(h[0])};
    if(m>=h[1]&&m<h[2])return{ab:false,txt:'Abre a las '+hhmm(h[2])};
  }
  for(var i=1;i<=7;i++){var w=(wd+i)%7;if(H[w])return{ab:false,txt:'Abre el '+DIAS[w]+' a las '+hhmm(H[w][0])}}
  return{ab:false,txt:'Cerrado'};
}
var e=estado(),dot=$('[data-open]'),hs=$('[data-openh]');
if(dot)dot.classList.toggle('off',!e.ab);
if(hs)hs.textContent=e.txt;
var hoyw=(new Date().getDay()+6)%7,hr=$('[data-hor] .hr[data-d="'+hoyw+'"]');
if(hr&&H[hoyw])hr.classList.add('now');

/* reserva */
var form=$('[data-form]');
if(form){
  var sel={serv:'Fisioterapia, primera visita',pro:'Me da igual',dia:'',hora:'',ymd:''};
  function pinta(k){var b=$('[data-r="'+k+'"]');if(b)b.textContent=sel[k]||'—'}

  ['serv','pro'].forEach(function(k){
    var g=$('[data-g="'+k+'"]');if(!g)return;
    $$('button',g).forEach(function(b){
      b.addEventListener('click',function(){
        $$('button',g).forEach(function(x){x.classList.remove('on')});
        b.classList.add('on');sel[k]=b.textContent.trim();pinta(k);
        if(k==='serv')horas();
      });
    });
    pinta(k);
  });

  var MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var DL=['L','M','X','J','V','S','D'];
  var days=$('[data-days]'),hoy=new Date();hoy.setHours(0,0,0,0);
  var primero=null;
  for(var i=0;i<21;i++){
    var d=new Date(hoy.getTime()+i*86400000),wd=(d.getDay()+6)%7;
    if(!H[wd])continue;
    var b=document.createElement('button');
    b.type='button';b.className='day';
    b.dataset.ymd=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    b.dataset.lbl=(i===0?'hoy':(i===1?'mañana':DIAS[wd]))+' '+d.getDate()+' de '+MESL[d.getMonth()];
    b.innerHTML='<small>'+DL[wd]+'</small><b>'+d.getDate()+'</b><i>'+MES[d.getMonth()]+'</i>';
    b.addEventListener('click',function(){
      $$('.day',days).forEach(function(x){x.classList.remove('on')});
      this.classList.add('on');sel.dia=this.dataset.lbl;sel.ymd=this.dataset.ymd;
      pinta('dia');horas();
    });
    days.appendChild(b);
    if(!primero)primero=b;
  }
  if(primero)primero.click();

  function horas(){
    var cont=$('[data-slots]');if(!cont)return;
    cont.innerHTML='';sel.hora='';pinta('hora');
    var paso=(sel.serv.indexOf('Pilates')===0)?60:30;
    var tramos=[[540,840],[960,1200]],ahora=new Date();
    var hoyYmd=ahora.getFullYear()+'-'+(ahora.getMonth()+1)+'-'+ahora.getDate();
    var lim=(sel.ymd===hoyYmd)?(ahora.getHours()*60+ahora.getMinutes()+90):-1;
    tramos.forEach(function(t){
      for(var m=t[0];m+paso<=t[1];m+=paso){
        if(m<lim)continue;
        var b=document.createElement('button');
        b.type='button';b.className='slot';b.textContent=hhmm(m);
        b.addEventListener('click',function(){
          $$('.slot',cont).forEach(function(x){x.classList.remove('on')});
          this.classList.add('on');sel.hora=this.textContent;pinta('hora');
        });
        cont.appendChild(b);
      }
    });
    if(!cont.children.length)cont.innerHTML='<p class="sm" style="margin:0">Hoy ya no quedan huecos. Elige otro día.</p>';
  }

  form.addEventListener('submit',function(ev){
    ev.preventDefault();
    var n=(form.elements.n.value||'').trim(),
        t=(form.elements.t.value||'').trim(),
        m=(form.elements.m.value||'').trim();
    if(!sel.hora){alert('Elige una hora para tu cita.');return}
    if(!n){alert('Dinos tu nombre para poder darte la cita.');form.elements.n.focus();return}
    if(!t){alert('Necesitamos un teléfono para confirmarte la cita.');form.elements.t.focus();return}
    var txt='Hola, quería pedir cita en FisioAvanza.\n\n'+
      'Tratamiento: '+sel.serv+'\n'+
      'Con: '+sel.pro+'\n'+
      'Día: '+sel.dia+'\n'+
      'Hora: '+sel.hora+'\n\n'+
      'Nombre: '+n+'\n'+
      'Teléfono: '+t+
      (m?('\n\nMotivo: '+m):'');
    window.open('https://wa.me/'+TEL+'?text='+encodeURIComponent(txt),'_blank');
  });
}
})();
