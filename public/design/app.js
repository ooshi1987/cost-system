/* Costra LP — small interactions */

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// Count-up animation on scroll into view
const counters = document.querySelectorAll('.js-count');
const ease = (t) => 1 - Math.pow(1 - t, 3);

const animateCount = (el) => {
  const target = parseFloat(el.dataset.target);
  const decimals = (el.dataset.target.split('.')[1] || '').length;
  const duration = 1400;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const v = target * ease(p);
    el.textContent = v.toFixed(decimals);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => io.observe(c));
}

// Reveal-on-scroll for sections
const revealEls = document.querySelectorAll('.pain__card, .feature, .plan');
revealEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity .6s ease, transform .6s ease';
});
if ('IntersectionObserver' in window) {
  const io2 = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const idx = [...entry.target.parentElement.children].indexOf(entry.target);
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, Math.max(0, idx) * 80);
        io2.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io2.observe(el));
}

// Pricing plan-variant toggle
const switchBtns = document.querySelectorAll('.plan-switch__btn');
const planGrids = document.querySelectorAll('.plans[data-variant]');
switchBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const variant = btn.dataset.variant;
    switchBtns.forEach(b => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    planGrids.forEach(g => {
      const on = g.dataset.variant === variant;
      g.hidden = !on;
      g.classList.toggle('is-active', on);
      if (on) {
        g.querySelectorAll('.plan').forEach(p => {
          p.style.opacity = '1';
          p.style.transform = 'translateY(0)';
        });
      }
    });
  });
});

// Product dashboard: keep the full desktop layout on phones, scaled to fit.
// Conveys "look how much gets datafied" rather than being read in detail.
(function () {
  const wrap = document.querySelector('.product__screen');
  if (!wrap) return;
  const screen = wrap.querySelector('.screen');
  if (!screen) return;
  const DESIGN_W = 1080;       // fixed desktop design width of the mock
  const BREAKPOINT = 880;      // matches the CSS layout-restore media query

  function fit() {
    if (window.innerWidth <= BREAKPOINT) {
      const avail = wrap.clientWidth;
      const scale = avail / DESIGN_W;
      screen.style.width = DESIGN_W + 'px';
      screen.style.transformOrigin = 'top left';
      screen.style.transform = 'scale(' + scale + ')';
      // collapse the vertical space the scale-down leaves behind
      wrap.style.overflow = 'hidden';
      wrap.style.height = (screen.offsetHeight * scale) + 'px';
    } else {
      screen.style.width = '';
      screen.style.transform = '';
      screen.style.transformOrigin = '';
      wrap.style.overflow = '';
      wrap.style.height = '';
    }
  }

  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
