/** Pulsing card-shaped placeholders while the very first launch data loads. */
export function LaunchListSkeleton() {
  return (
    <div class="launch-grid" aria-busy="true" aria-label="Loading launches">
      {[0, 1, 2, 3].map((i) => <div key={i} class="skeleton" data-testid="skeleton-item" />)}
    </div>
  );
}
