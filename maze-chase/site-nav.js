(() => {
  const nav = document.querySelector(".site-nav");
  const active = nav && nav.querySelector('[aria-current="page"]');
  if (!nav || !active) return;
  const box = nav.getBoundingClientRect();
  const pill = active.getBoundingClientRect();
  if (pill.left >= box.left && pill.right <= box.right) return;
  nav.scrollLeft += pill.left - box.left - (box.width - pill.width) / 2;
})();
