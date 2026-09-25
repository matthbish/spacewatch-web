import { Icon } from '../icons';

export function FavoriteButton({ isFavorite, onToggle, label }: {
  isFavorite: boolean;
  onToggle: () => void;
  /** What's being favorited, for screen readers, e.g. "Falcon 9". */
  label?: string;
}) {
  const action = isFavorite ? 'Unfavorite' : 'Favorite';
  return (
    <button
      type="button"
      class={`icon-button favorite-button${isFavorite ? ' is-favorite' : ''}`}
      aria-pressed={isFavorite}
      aria-label={label ? `${action} ${label}` : action}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
    >
      <Icon name={isFavorite ? 'star' : 'starBorder'} />
    </button>
  );
}
