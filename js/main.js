// Header scroll effect
const header = document.getElementById('header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 30), { passive: true });

// Nav mobile toggle
const menuBtn = document.getElementById('menuBtn');
const navMobile = document.getElementById('navMobile');
menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = navMobile.classList.toggle('open');
  menuBtn.querySelector('i').className = open ? 'fas fa-times' : 'fas fa-bars';
  menuBtn.setAttribute('aria-expanded', String(open));
});
function closeMenu() {
  navMobile.classList.remove('open');
  menuBtn.querySelector('i').className = 'fas fa-bars';
  menuBtn.setAttribute('aria-expanded', 'false');
}
// Tocar fuera del panel lo cierra; el botón se excluye porque ya alterna.
document.addEventListener('click', (e) => {
  if (navMobile.classList.contains('open') &&
      !e.target.closest('#navMobile') && !e.target.closest('#menuBtn')) {
    closeMenu();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navMobile.classList.contains('open')) {
    closeMenu();
    menuBtn.focus();
  }
});

// Selector de idioma compacto (sólo visible en móvil)
const langBtn = document.getElementById('langBtn');
const langMenu = document.getElementById('langMenu');
if (langBtn && langMenu) {
  const abrirLang = (abrir) => {
    langMenu.hidden = !abrir;
    langBtn.setAttribute('aria-expanded', String(abrir));
  };
  langBtn.addEventListener('click', (e) => {
    /* Se detiene la propagación para que el listener de «clic fuera» no lo
     * cierre en el mismo clic; por eso hay que cerrar el panel a mano. */
    e.stopPropagation();
    closeMenu();
    abrirLang(langMenu.hidden);
  });
  // Clic fuera y Escape lo cierran; sin esto queda abierto al navegar por la página.
  document.addEventListener('click', (e) => {
    if (!langMenu.hidden && !e.target.closest('.lang-wrap')) abrirLang(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !langMenu.hidden) { abrirLang(false); langBtn.focus(); }
  });
  // Abrir el menú hamburguesa cierra este, para que no se solapen.
  if (typeof menuBtn !== 'undefined' && menuBtn) {
    menuBtn.addEventListener('click', () => abrirLang(false));
  }
}

// FAQ accordion
document.querySelectorAll('.faq-q').forEach(btn =>
  btn.addEventListener('click', () => btn.closest('.faq-item').classList.toggle('open'))
);

// Scroll reveal
const ro = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
  });
}, { threshold: .1, rootMargin: '0px 0px -36px 0px' });

document.querySelectorAll('.reveal').forEach(el => ro.observe(el));
