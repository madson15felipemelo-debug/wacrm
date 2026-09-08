/**
 * Decorative accent wash used behind the auth cards.
 *
 * LUMA's sign-in screens sit on a softly graded surface rather than a
 * flat background: two large accent washes bleeding in from opposite
 * corners. Purely visual — `aria-hidden` and pointer events off, so it
 * never interferes with the form.
 *
 * Drawn with radial gradients rather than `blur-3xl` on solid circles.
 * A 420px blurred element is one of the most expensive things you can
 * put on a page (the compositor filters the whole box every frame the
 * layer is touched); the gradient is a single paint and looks the same.
 *
 * Expects a positioned, `overflow-hidden` parent (the auth pages use
 * `luma-shell relative … overflow-hidden`).
 */
export function AuthAurora() {
  return (
    <>
      <div
        aria-hidden
        className="luma-wash pointer-events-none absolute -top-40 -left-32 h-[420px] w-[420px]"
      />
      <div
        aria-hidden
        className="luma-wash pointer-events-none absolute -right-32 -bottom-40 h-[420px] w-[420px]"
      />
    </>
  );
}
