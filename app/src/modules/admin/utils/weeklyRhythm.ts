/** A slot in the week, Monday first, as the server sends it. */
export interface WeekSlot {
  weekday: number;
  hour: number;
  value: number;
}

/** Shade 0 is reserved for slots without anyone, so even the faintest use
 * stays visible next to them. Above that the scale is linear to the busiest slot. */
export function intensityLevel(value: number, max: number, levels: number) {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(levels, Math.max(1, Math.ceil((value / max) * levels)));
}

/** The first busiest slot of the week, or `null` while no one has used the app. */
export function busiestSlot(grid: readonly (readonly number[])[]) {
  let busiest: WeekSlot | null = null;
  grid.forEach((hours, weekday) =>
    hours.forEach((value, hour) => {
      if (value > (busiest?.value ?? 0)) busiest = { weekday, hour, value };
    }),
  );
  return busiest as WeekSlot | null;
}
