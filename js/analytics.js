/* Analítica de interacciones — Deckel
 *
 * Emite eventos GA4 que describen la acción e identifican dónde se gatilló.
 * Todos los eventos llevan `subsitio` (home, aeropuerto, esqui, vinas, costa,
 * corporativo, mantencion) y `ubicacion` (nav, hero, precios, faq, footer…).
 *
 * Los enlaces de WhatsApp ya traen su propio onclick con gtag; este módulo los
 * ignora para no contar dos veces.
 */
(function () {
  'use strict';
  if (typeof gtag !== 'function') return;

  /* El subsitio lo declara la propia página en <html data-subsitio>, para que
   * coincida con el de los eventos del marcado. Sin él, se deduce del archivo
   * (páginas que aún no pasan por construir.py). */
  var RESPALDO = {
    'index': 'home',
    'indexmantencion': 'mantencion',
    'servicio-aeropuerto': 'aeropuerto',
    'servicio-corporativo': 'corporativo',
    'servicio-costa': 'costa',
    'servicio-esqui': 'esqui',
    'servicio-vinas': 'vinas'
  };
  var raiz = document.documentElement;
  var archivo = (location.pathname.split('/').pop() || 'index.html')
                  .replace(/\.html?$/i, '').toLowerCase();
  var subsitio = raiz.getAttribute('data-subsitio') || RESPALDO[archivo] || archivo || 'home';
  var idioma = (raiz.getAttribute('lang') || 'es').slice(0, 2);

  function enviar(evento, datos) {
    datos.subsitio = subsitio;
    datos.idioma = idioma;
    gtag('event', evento, datos);
  }

  /* Dónde está el elemento dentro de la página. */
  function ubicacion(el) {
    if (el.closest('.wa-float')) return 'flotante';
    if (el.closest('.nav-mobile')) return 'nav_mobile';
    if (el.closest('.header')) return 'nav';
    if (el.closest('.footer')) return 'footer';
    if (el.closest('.hero')) return 'hero';
    if (el.closest('.cta-band')) return 'cta';
    var sec = el.closest('section[id]');
    if (sec) return sec.id;
    var cls = el.closest('section');
    if (cls && cls.className) return cls.className.trim().split(/\s+/)[0];
    return 'otro';
  }

  function texto(el) {
    return (el.getAttribute('aria-label') || el.textContent || '')
             .replace(/\s+/g, ' ').trim().slice(0, 60);
  }

  /* Un solo listener delegado para todos los clics. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;

    /* Ya instrumentado en el propio marcado: no duplicar. */
    var propio = a.getAttribute('onclick') || '';
    if (propio.indexOf('gtag') !== -1) return;

    var href = a.getAttribute('href') || '';
    var donde = ubicacion(a);

    if (/wa\.me|api\.whatsapp/.test(href)) {
      enviar('whatsapp_click', { button: donde });
    } else if (/^tel:/i.test(href)) {
      enviar('tel_click', { ubicacion: donde, numero: href.replace(/^tel:/i, '') });
    } else if (/^mailto:/i.test(href)) {
      enviar('mail_click', { ubicacion: donde });
    } else if (/instagram|facebook|tiktok|youtube|x\.com|twitter/i.test(href)) {
      var red = (href.match(/instagram|facebook|tiktok|youtube|twitter|x\.com/i) || ['red'])[0];
      enviar('social_click', { network: red.toLowerCase().replace('.com', ''), ubicacion: donde });
    } else if (/servicio-[a-z]+\.html/i.test(href)) {
      var destino = (href.match(/servicio-([a-z]+)\.html/i) || [])[1];
      enviar('servicio_click', { destino: destino, ubicacion: donde, etiqueta: texto(a) });
    } else if (/^https?:/i.test(href) && href.indexOf(location.host) === -1) {
      enviar('externo_click', { ubicacion: donde, destino: href });
    } else if (a.classList.contains('btn')) {
      enviar('cta_click', { ubicacion: donde, etiqueta: texto(a) });
    } else if (/\.html/i.test(href) || href.charAt(0) === '#') {
      enviar('nav_click', { ubicacion: donde, destino: href });
    }
  }, true);

  /* Apertura de preguntas frecuentes. */
  document.querySelectorAll('.faq-q').forEach(function (b) {
    b.addEventListener('click', function () {
      var item = b.closest('.faq-item');
      /* main.js alterna la clase en el mismo clic; se lee el estado resultante. */
      setTimeout(function () {
        if (item && item.classList.contains('open')) {
          enviar('faq_open', { pregunta: texto(b) });
        }
      }, 0);
    });
  });

  /* Profundidad de lectura: señal de interés por subsitio.
   * El `overflow-x:hidden` de shared.css hace que el contenedor de scroll sea
   * el propio <body> en vez de la ventana, así que window.scrollY se queda en 0.
   * Se toma el mayor de los tres candidatos para funcionar en ambos casos. */
  function desplazamiento() {
    return Math.max(window.scrollY || 0,
                    document.body.scrollTop || 0,
                    document.documentElement.scrollTop || 0);
  }
  function alcance() {
    var d = document.documentElement, b = document.body;
    return Math.max(d.scrollHeight, b.scrollHeight) - window.innerHeight;
  }

  var hitos = [25, 50, 75, 90], vistos = {};
  function medir() {
    var alto = alcance();
    if (alto <= 0) return;
    var pct = (desplazamiento() / alto) * 100;
    hitos.forEach(function (h) {
      if (pct >= h && !vistos[h]) { vistos[h] = 1; enviar('scroll_profundidad', { porcentaje: h }); }
    });
  }
  ['scroll', 'touchmove'].forEach(function (ev) {
    window.addEventListener(ev, medir, { passive: true });
    document.body.addEventListener(ev, medir, { passive: true });
  });
})();
