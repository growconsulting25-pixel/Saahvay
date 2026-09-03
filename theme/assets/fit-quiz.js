/*
  SaahVay fit quiz.
  Six visual questions. Each answer adds points to one or more shapes.
  Shapes: H (Rectangle), O (Apple), V (Inverted Triangle), X (Hourglass), A (Pear).
  Result is stored in localStorage as saahvay_shape and can be deep-linked with ?shape=A.
*/

if (!customElements.get('fit-quiz')) {
  customElements.define(
    'fit-quiz',
    class FitQuiz extends HTMLElement {
      constructor() {
        super();
        this.shapes = ['H', 'O', 'V', 'X', 'A'];
        this.tieBreak = ['X', 'A', 'H', 'V', 'O'];
        this.steps = Array.from(this.querySelectorAll('.fit-quiz__step'));
        this.result = this.querySelector('.fit-quiz__result');
        this.progressFill = this.querySelector('.fit-quiz__bar-fill');
        this.progressText = this.querySelector('.fit-quiz__progress-text');
        this.answers = new Array(this.steps.length).fill(null);
        this.current = 0;
        this.productsCache = {};
        this.storageKey = 'saahvay_shape';
      }

      connectedCallback() {
        this.querySelectorAll('.sv-tile').forEach((tile) => {
          tile.addEventListener('click', (event) => this.onSelect(event));
        });
        this.querySelectorAll('[data-quiz-back]').forEach((button) => {
          button.addEventListener('click', () => this.go(this.current - 1));
        });
        this.querySelectorAll('[data-quiz-restart]').forEach((button) => {
          button.addEventListener('click', () => this.restart());
        });

        const params = new URLSearchParams(window.location.search);
        const linked = (params.get('shape') || '').toUpperCase();
        if (this.shapes.includes(linked)) {
          this.showResult(linked, null);
          return;
        }
        this.go(0);
      }

      onSelect(event) {
        const tile = event.currentTarget;
        const step = tile.closest('.fit-quiz__step');
        const index = this.steps.indexOf(step);
        step.querySelectorAll('.sv-tile').forEach((t) => t.setAttribute('aria-pressed', 'false'));
        tile.setAttribute('aria-pressed', 'true');
        this.answers[index] = this.parseScores(tile.dataset.scores);
        window.setTimeout(() => {
          if (index + 1 < this.steps.length) {
            this.go(index + 1);
          } else {
            this.finish();
          }
        }, 180);
      }

      parseScores(raw) {
        const scores = {};
        (raw || '').split(',').forEach((pair) => {
          const [letter, points] = pair.split(':');
          if (letter && this.shapes.includes(letter.trim().toUpperCase())) {
            scores[letter.trim().toUpperCase()] = parseInt(points, 10) || 1;
          }
        });
        return scores;
      }

      go(index) {
        if (index < 0 || index >= this.steps.length) return;
        this.current = index;
        this.result.setAttribute('aria-hidden', 'true');
        this.steps.forEach((step, i) => {
          step.setAttribute('aria-hidden', i === index ? 'false' : 'true');
        });
        const pct = Math.round((index / this.steps.length) * 100);
        this.progressFill.style.width = `${pct}%`;
        if (this.progressText) {
          this.progressText.textContent = this.progressText.dataset.template
            .replace('[current]', index + 1)
            .replace('[total]', this.steps.length);
        }
        const heading = this.steps[index].querySelector('.fit-quiz__question');
        if (heading) heading.focus({ preventScroll: false });
        this.querySelector('.fit-quiz__progress').hidden = false;
      }

      finish() {
        const totals = {};
        this.shapes.forEach((s) => (totals[s] = 0));
        this.answers.forEach((scores) => {
          if (!scores) return;
          Object.keys(scores).forEach((letter) => (totals[letter] += scores[letter]));
        });
        const ranked = this.shapes
          .slice()
          .sort((a, b) => totals[b] - totals[a] || this.tieBreak.indexOf(a) - this.tieBreak.indexOf(b));
        const winner = ranked[0];
        const runnerUp = ranked[1];
        const close = totals[winner] - totals[runnerUp] <= 1 && totals[runnerUp] > 0 ? runnerUp : null;
        this.showResult(winner, close);
      }

      showResult(letter, runnerUp) {
        this.steps.forEach((step) => step.setAttribute('aria-hidden', 'true'));
        this.querySelector('.fit-quiz__progress').hidden = true;
        this.progressFill.style.width = '100%';

        this.result.querySelectorAll('[data-shape-panel]').forEach((panel) => {
          panel.hidden = panel.dataset.shapePanel !== letter;
        });
        const runner = this.result.querySelector(`[data-shape-panel="${letter}"] [data-runner-up]`);
        if (runner) {
          if (runnerUp) {
            const name = this.result.querySelector(`[data-shape-panel="${runnerUp}"]`)?.dataset.shapeName || runnerUp;
            runner.textContent = runner.dataset.template.replace('[shape]', name);
            runner.hidden = false;
          } else {
            runner.hidden = true;
          }
        }

        const tagInput = this.result.querySelector('input[name="contact[tags]"]');
        if (tagInput) tagInput.value = `newsletter,quiz,shape-${letter}`;

        const shareLink = this.result.querySelector('[data-result-link]');
        if (shareLink) {
          const url = new URL(window.location.href);
          url.searchParams.set('shape', letter);
          shareLink.value = url.toString();
        }

        try {
          window.localStorage.setItem(this.storageKey, letter);
        } catch (e) {
          /* storage unavailable: result still shows */
        }

        this.result.setAttribute('aria-hidden', 'false');
        const heading = this.result.querySelector(`[data-shape-panel="${letter}"] h2`);
        if (heading) heading.focus();
        window.scrollTo({ top: this.offsetTop - 24, behavior: 'smooth' });

        this.loadProducts(letter);
      }

      loadProducts(letter) {
        const target = this.result.querySelector(`[data-shape-panel="${letter}"] [data-shape-products]`);
        if (!target) return;
        const url = target.dataset.url;
        if (!url) return;
        if (this.productsCache[letter]) {
          target.innerHTML = this.productsCache[letter];
          return;
        }
        target.setAttribute('aria-busy', 'true');
        fetch(url)
          .then((response) => (response.ok ? response.text() : Promise.reject(response.status)))
          .then((html) => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const inner = doc.querySelector('[data-shape-products-inner]');
            const markup = inner ? inner.innerHTML : '';
            this.productsCache[letter] = markup;
            target.innerHTML = markup;
          })
          .catch(() => {
            target.innerHTML = '';
          })
          .finally(() => target.removeAttribute('aria-busy'));
      }

      restart() {
        this.answers.fill(null);
        this.querySelectorAll('.sv-tile').forEach((t) => t.setAttribute('aria-pressed', 'false'));
        const url = new URL(window.location.href);
        url.searchParams.delete('shape');
        window.history.replaceState({}, '', url.toString());
        this.go(0);
      }
    }
  );
}
