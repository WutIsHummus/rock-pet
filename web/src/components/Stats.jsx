import { Heart, Bolt, Clock } from './icons.jsx';

/**
 * Three pastel stat pills shown beneath the rock: mood, energy, age.
 * Values are rounded for display; underlying state is fractional.
 */
export default function Stats({ mood, energy, age }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mt-2">
      <span className="stat-pill stat-pill-mood text-xs sm:text-sm">
        <Heart />mood {Math.round(mood)}
      </span>
      <span className="stat-pill stat-pill-energy text-xs sm:text-sm">
        <Bolt />energy {Math.round(energy)}
      </span>
      <span className="stat-pill stat-pill-age text-xs sm:text-sm">
        <Clock />{Math.round(age)}h
      </span>
    </div>
  );
}
