// Header scroll effect
const header = document.getElementById('header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 30), { passive: true });

// Nav mobile toggle
const menuBtn = document.getElementById('menuBtn');
const navMobile = document.getElementById('navMobile');
menuBtn.addEventListener('click', () => {
  const open = navMobile.classList.toggle('open');
  menuBtn.querySelector('i').className = open ? 'fas fa-times' : 'fas fa-bars';
});
function closeMenu() {
  navMobile.classList.remove('open');
  menuBtn.querySelector('i').className = 'fas fa-bars';
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
