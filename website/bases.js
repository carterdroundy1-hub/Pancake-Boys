// Limits the pancake flavor picker (field name pancake_bases) to the selected package. Fewer is allowed.
(function () {
  const limits = { 'The Trail': 2, 'The Ridge': 3, 'The Summit': 4 };

  document.querySelectorAll('[data-base-picker]').forEach(picker => {
    const form = picker.closest('form');
    if (!form) return;
    const boxes = [...picker.querySelectorAll('input[name="pancake_bases"]')];
    const note = picker.querySelector('[data-base-note]');
    const packageField = form.querySelector('[data-package-field]');

    const maxBases = () => {
      const choice = packageField ? packageField.value : '';
      return Object.prototype.hasOwnProperty.call(limits, choice) ? limits[choice] : 4;
    };
    const count = () => boxes.filter(box => box.checked).length;
    const message = max => {
      const choice = packageField ? packageField.value : '';
      if (limits[choice]) return `${choice} is ${max} flavors. Fewer is fine — not more.`;
      return 'Four flavors is the most you can pick. Fewer is fine.';
    };
    const show = text => { if (note) note.textContent = text || ''; };

    boxes.forEach(box => {
      box.addEventListener('change', () => {
        const max = maxBases();
        if (box.checked && count() > max) {
          box.checked = false;
          show(message(max));
          return;
        }
        show('');
      });
    });

    if (packageField) {
      packageField.addEventListener('change', () => {
        const max = maxBases();
        const extra = count() - max;
        show(extra > 0 ? `${message(max)} Uncheck ${extra} to match.` : '');
      });
    }

    form.addEventListener('submit', event => {
      const max = maxBases();
      if (count() <= max) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      show(message(max));
      if (note) note.focus();
    });
  });
})();
