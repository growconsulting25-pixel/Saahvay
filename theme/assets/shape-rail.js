/* Shape rail: five tabs, one stage. Choosing a letter swaps the portrait and the panel. */
if (!customElements.get('shape-rail')) {
  customElements.define(
    'shape-rail',
    class ShapeRail extends HTMLElement {
      constructor() {
        super();
        this.tabs = [...this.querySelectorAll('.shape-rail__tab')];
        this.portraits = [...this.querySelectorAll('.shape-rail__portrait')];
        this.panels = [...this.querySelectorAll('.shape-rail__panel')];
        this.mark = this.querySelector('[data-rail-mark]');
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.current = this.tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.dataset.shape || null;
        this.timer = null;

        this.addEventListener('click', (e) => {
          const tab = e.target.closest('.shape-rail__tab');
          if (tab) this.select(tab.dataset.shape, false);
        });
        this.addEventListener('keydown', (e) => this.onKey(e));
      }

      onKey(e) {
        if (!e.target.closest('.shape-rail__tab')) return;
        const keys = this.tabs.map((t) => t.dataset.shape);
        const i = keys.indexOf(this.current);
        let next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % keys.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + keys.length) % keys.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = keys.length - 1;
        if (next === null) return;
        e.preventDefault();
        this.select(keys[next], true);
      }

      select(shape, focusTab) {
        if (shape === this.current) return;
        this.current = shape;
        this.tabs.forEach((t) => {
          const on = t.dataset.shape === shape;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
          if (on && focusTab) t.focus();
        });
        this.portraits.forEach((img) => img.classList.toggle('is-on', img.dataset.shape === shape));
        if (this.mark) this.mark.textContent = shape;

        const show = () => this.panels.forEach((p) => (p.hidden = p.dataset.shape !== shape));
        clearTimeout(this.timer);
        const panelsEl = this.querySelector('.shape-rail__panels');
        if (this.reduceMotion.matches || !panelsEl) {
          show();
          return;
        }
        panelsEl.classList.add('is-swapping');
        this.timer = setTimeout(() => {
          show();
          requestAnimationFrame(() => panelsEl.classList.remove('is-swapping'));
        }, 220);
      }
    }
  );
}
