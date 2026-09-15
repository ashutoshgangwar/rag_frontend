/**
 * The moving backdrop behind the signed-out screen: three big blurred colour
 * fields drifting over a faint grid.
 *
 * Deliberately all CSS — no canvas, no rAF loop. It costs three composited
 * layers and nothing on the main thread, and the reduced-motion rule at the
 * bottom of the stylesheet parks it without this file knowing.
 */
export default function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <span className="aurora-orb aurora-orb-1" />
      <span className="aurora-orb aurora-orb-2" />
      <span className="aurora-orb aurora-orb-3" />
      <span className="aurora-grid" />
      <span className="aurora-veil" />
    </div>
  )
}
