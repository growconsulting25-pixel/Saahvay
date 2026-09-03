/*
  SaahVay outfit builder.
  Lets the customer pick a size per piece, drop pieces, and add the whole look
  to the cart in one request through Shopify's /cart/add.js. Reuses Dawn's cart
  drawer rendering so the drawer opens with the updated contents.
*/

if (!customElements.get('outfit-builder')) {
  customElements.define(
    'outfit-builder',
    class OutfitBuilder extends HTMLElement {
      constructor() {
        super();
        this.items = Array.from(this.querySelectorAll('.outfit-item'));
        this.totalEl = this.querySelector('[data-outfit-total]');
        this.countEl = this.querySelector('[data-outfit-count]');
        this.errorEl = this.querySelector('[data-outfit-error]');
        this.submit = this.querySelector('[data-outfit-submit]');
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.currency = this.dataset.currency || '';
        this.moneyFormat = this.dataset.moneyFormat || '{{amount}}';
      }

      connectedCallback() {
        this.items.forEach((item) => {
          const select = item.querySelector('.outfit-item__select');
          const toggle = item.querySelector('.outfit-item__toggle input');
          if (select) select.addEventListener('change', () => this.update());
          if (toggle) {
            toggle.addEventListener('change', () => {
              item.dataset.included = toggle.checked ? 'true' : 'false';
              this.update();
            });
          }
        });
        if (this.submit) this.submit.addEventListener('click', (event) => this.addAll(event));
        this.update();
      }

      selectedLines() {
        return this.items
          .filter((item) => item.dataset.included !== 'false')
          .map((item) => {
            const select = item.querySelector('.outfit-item__select');
            const option = select ? select.selectedOptions[0] : null;
            return {
              item,
              id: option ? parseInt(option.value, 10) : parseInt(item.dataset.variantId, 10),
              price: option ? parseInt(option.dataset.price, 10) : parseInt(item.dataset.price, 10),
              available: option ? option.dataset.available === 'true' : item.dataset.available === 'true',
            };
          });
      }

      update() {
        const lines = this.selectedLines();
        const total = lines.reduce((sum, line) => sum + (line.price || 0), 0);
        if (this.totalEl) this.totalEl.textContent = this.formatMoney(total);
        if (this.countEl) {
          this.countEl.textContent = this.countEl.dataset.template.replace('[count]', lines.length);
        }
        const unavailable = lines.filter((line) => !line.available);
        if (this.submit) this.submit.disabled = lines.length === 0 || unavailable.length > 0;
        this.setError(unavailable.length > 0 ? this.dataset.unavailableMessage : '');
      }

      formatMoney(cents) {
        const amount = (cents / 100).toFixed(2);
        const parts = amount.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return this.moneyFormat.replace(/\{\{\s*amount\s*\}\}/, parts.join('.')).replace(/\{\{\s*amount_no_decimals\s*\}\}/, parts[0]);
      }

      setError(message) {
        if (this.errorEl) this.errorEl.textContent = message || '';
      }

      addAll(event) {
        event.preventDefault();
        const lines = this.selectedLines().filter((line) => line.id);
        if (!lines.length) return;

        this.submit.setAttribute('aria-disabled', 'true');
        this.submit.classList.add('loading');
        this.setError('');

        const body = {
          items: lines.map((line) => ({ id: line.id, quantity: 1 })),
        };
        if (this.cart && typeof this.cart.getSectionsToRender === 'function') {
          body.sections = this.cart.getSectionsToRender().map((section) => section.id);
          body.sections_url = window.location.pathname;
          this.cart.setActiveElement(document.activeElement);
        }

        fetch(window.routes.cart_add_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/javascript', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify(body),
        })
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              this.setError(response.description || response.message || this.dataset.errorMessage);
              return;
            }
            if (typeof publish === 'function' && window.PUB_SUB_EVENTS) {
              publish(PUB_SUB_EVENTS.cartUpdate, { source: 'outfit-builder', cartData: response });
            }
            if (this.cart && typeof this.cart.renderContents === 'function') {
              this.cart.renderContents(response);
            } else {
              window.location = window.routes.cart_url;
            }
          })
          .catch(() => this.setError(this.dataset.errorMessage))
          .finally(() => {
            this.submit.classList.remove('loading');
            this.submit.removeAttribute('aria-disabled');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
          });
      }
    }
  );
}
