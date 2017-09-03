export function translateXY(tx, ty) {
  return `translateX(${tx}px) translateY(${ty}px)`;
}
export function scale(s) {
  return `scale(${s})`;
}
export function transform(...transforms) {
  return { transform: transforms.join(' ') };
}
