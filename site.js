(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.mobile-menu');
  const menuLinks = [...menu.querySelectorAll('a')];
  const sources = document.querySelector('#sources');
  const setMenu = (open, restoreFocus = true) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menu.hidden = !open;
    header.classList.toggle('menu-active', open);
    document.body.classList.toggle('menu-open', open);
    document.querySelector('main').inert = open;
    document.querySelector('footer').inert = open;
    if (open) menuLinks[0].focus();
    else if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false, false);
  });
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') setMenu(false);
    if (event.key === 'Tab') {
      const items = [toggle, ...menuLinks];
      const current = items.indexOf(document.activeElement);
      event.preventDefault();
      items[(current + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    }
  });
  const desktop = matchMedia('(min-width:861px)');
  desktop.addEventListener('change', event => {
    if (event.matches && !menu.hidden) setMenu(false, false);
  });
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const revealSource = hash => {
    if (hash !== '#sources' && hash !== '#source-monitor') return false;
    sources.open = true;
    return true;
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) revealSource(link.getAttribute('href'));
  });
  if (revealSource(location.hash)) {
    requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
  }
  addEventListener('hashchange', () => revealSource(location.hash));
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }
})();
