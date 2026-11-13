function closeDrops(except) {
  document.querySelectorAll('.nav-drop[open]').forEach(drop => {
    if (drop === except) return;
    drop.removeAttribute('open');
  });
}

document.addEventListener('click', event => {
  const drop = event.target.closest?.('.nav-drop');
  closeDrops(drop || null);
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const open = document.querySelector('.nav-drop[open]');
  if (!open) return;
  open.removeAttribute('open');
  open.querySelector('summary')?.focus();
}, true);
