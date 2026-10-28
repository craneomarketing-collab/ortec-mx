// Banner de cookies + Google Consent Mode v2 (autocontenido, sin depender del bundle).
// CONSENT_HEAD va en <head> ANTES del snippet de GTM; CONSENT_BANNER antes de </body>.
const COOKIE = "ortec_consent"; // valores: granted | denied ; 180 dias

const CONSENT_HEAD = "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}" +
  "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});" +
  "(function(){var m=document.cookie.match(/(?:^|; )" + COOKIE + "=(granted|denied)/);if(m&&m[1]==='granted'){" +
  "gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});" +
  "dataLayer.push({event:'consent_update',consent_marketing:true});}else if(m){dataLayer.push({event:'consent_update',consent_marketing:false});}})();</script>";

const CONSENT_BANNER = `<style>
#ortec-cc{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#121f38;color:#f4f1ea;font-family:"Manrope","Segoe UI",system-ui,sans-serif;font-size:14px;line-height:1.45;box-shadow:0 -8px 24px -12px rgba(0,0,0,.4);border-top:3px solid #1d8649}
#ortec-cc[hidden]{display:none}
#ortec-cc .cc-in{max-width:1120px;margin:0 auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
#ortec-cc p{margin:0}
#ortec-cc strong{font-family:"Fraunces","Times New Roman",serif;font-weight:600;font-size:15px}
#ortec-cc .cc-b{display:flex;gap:8px}
#ortec-cc button{flex:1;min-height:44px;padding:0 20px;border-radius:999px;font:600 14px/1 inherit;font-family:inherit;cursor:pointer;border:1px solid #f4f1ea}
#ortec-cc .cc-ok{background:#1d8649;border-color:#1d8649;color:#fff}
#ortec-cc .cc-ok:hover{background:#6ba43a;border-color:#6ba43a}
#ortec-cc .cc-no{background:transparent;color:#f4f1ea}
#ortec-cc .cc-no:hover{background:rgba(244,241,234,.1)}
#ortec-cc button:focus-visible{outline:2px solid #6ba43a;outline-offset:2px}
@media (min-width:640px){#ortec-cc .cc-in{flex-direction:row;align-items:center;justify-content:space-between;gap:24px}#ortec-cc .cc-b{flex:0 0 auto}#ortec-cc button{flex:0 0 auto}}
</style>
<div id="ortec-cc" role="region" aria-labelledby="ortec-cc-t" aria-describedby="ortec-cc-d" hidden>
<div class="cc-in"><p id="ortec-cc-d"><strong id="ortec-cc-t">Usamos cookies</strong><br>Usamos cookies necesarias para que el sitio funcione. Con tu permiso, también usamos cookies de analítica y marketing para medir visitas y mejorar nuestros anuncios.</p>
<div class="cc-b"><button type="button" class="cc-no" data-cc="denied">Rechazar</button><button type="button" class="cc-ok" data-cc="granted">Aceptar</button></div></div></div>
<script>(function(){var C='${COOKIE}',b=document.getElementById('ortec-cc');if(!b)return;
if(!/(?:^|; )${COOKIE}=(granted|denied)/.test(document.cookie))b.hidden=false;
function save(v){var s=location.protocol==='https:'?';Secure':'';document.cookie=C+'='+v+';Max-Age='+(180*24*3600)+';Path=/;SameSite=Lax'+s;}
b.addEventListener('click',function(e){var t=e.target.closest('[data-cc]');if(!t)return;var v=t.getAttribute('data-cc'),g=v==='granted';save(v);
window.dataLayer=window.dataLayer||[];if(typeof gtag!=='function'){window.gtag=function(){dataLayer.push(arguments);};}
if(g){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}
dataLayer.push({event:'consent_update',consent_marketing:g});b.hidden=true;});})();</script>`;

function injectConsent(html) {
  if (html.indexOf('id="ortec-cc"') !== -1) return html;
  let out = html;
  const head = out.match(/<head[^>]*>/i);
  if (head) {
    const i = out.indexOf(head[0]) + head[0].length;
    out = out.slice(0, i) + CONSENT_HEAD + out.slice(i);
  }
  const j = out.search(/<\/body>/i);
  out = j !== -1 ? out.slice(0, j) + CONSENT_BANNER + out.slice(j) : out + CONSENT_BANNER;
  return out;
}

module.exports = { injectConsent };
