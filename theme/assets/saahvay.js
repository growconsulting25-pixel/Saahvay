/*
  SaahVay theme behaviours that are not tied to one section.
  1. Sticky add-to-cart on mobile product pages: when the real button scrolls
     out of view, it is pinned to the bottom of the screen. Same button, same
     form, so nothing about add-to-cart changes.
  2. Remembers the quiz result and marks the matching shape link in navigation.
*/

(function () {
  const mobile = window.matchMedia('(max-width: 749px)');

  function initStickyAddToCart() {
    const form = document.querySelector('product-form form[data-type="add-to-cart-form"]');
    const button = form && form.querySelector('.product-form__submit');
    if (!button || !('IntersectionObserver' in window)) return;

    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.height = '1px';
    button.parentNode.insertBefore(sentinel, button);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const passed = entry.boundingClientRect.top < 0 && !entry.isIntersecting;
        button.classList.toggle('sv-sticky-active', mobile.matches && passed);
      },
      { threshold: 0 }
    );
    observer.observe(sentinel);
    mobile.addEventListener('change', () => {
      if (!mobile.matches) button.classList.remove('sv-sticky-active');
    });
  }

  function markSavedShape() {
    let letter = null;
    try {
      letter = window.localStorage.getItem('saahvay_shape');
    } catch (e) {
      return;
    }
    if (!letter) return;
    document.querySelectorAll(`a[href*="/collections/shape-${letter.toLowerCase()}"]`).forEach((link) => {
      if (link.closest('.shape-guide__switch')) return;
      link.setAttribute('data-saved-shape', 'true');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initStickyAddToCart();
    markSavedShape();
  });
})();
