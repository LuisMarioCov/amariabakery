const reducedMotion = "(prefers-reduced-motion: reduce)";

function cartTarget(): DOMRect | null {
  return document.getElementById("cart-button")?.getBoundingClientRect() ?? null;
}

export function flyToCart(from: DOMRect, label: string, then: () => void): void {
  const end = cartTarget();
  if (!end || window.matchMedia(reducedMotion).matches) {
    then();
    return;
  }
  const flyer = document.createElement("div");
  flyer.className = "cart-flyer";
  flyer.setAttribute("aria-hidden", "true");
  flyer.textContent = label;
  const x = from.left + from.width / 2;
  const y = from.top + from.height / 2;
  flyer.style.left = `${x}px`;
  flyer.style.top = `${y}px`;
  document.body.appendChild(flyer);
  const dx = end.left + end.width / 2 - x;
  const dy = end.top + end.height / 2 - y;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    flyer.remove();
    then();
  };
  requestAnimationFrame(() => {
    flyer.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`;
    flyer.style.opacity = "0.15";
  });
  flyer.addEventListener("transitionend", finish, { once: true });
  window.setTimeout(finish, 700);
}

export function throwDialogToCart(dialog: HTMLElement, shade: HTMLElement | null, then: () => void): void {
  const end = cartTarget();
  if (!end || window.matchMedia(reducedMotion).matches) {
    then();
    return;
  }
  const start = dialog.getBoundingClientRect();
  const dx = end.left + end.width / 2 - (start.left + start.width / 2);
  const dy = end.top + end.height / 2 - (start.top + start.height / 2);
  dialog.classList.add("is-leaving");
  shade?.classList.add("is-leaving");
  requestAnimationFrame(() => {
    dialog.style.transform = `translate(${dx}px, ${dy}px) scale(0.08)`;
    dialog.style.opacity = "0";
  });
  window.setTimeout(then, 560);
}
