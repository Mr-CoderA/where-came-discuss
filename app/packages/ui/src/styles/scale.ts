/** 6px modular scale — keep in lockstep with tokens.css */
export const SPACE_SCALE_PX = [6, 12, 18, 24, 30, 36, 48, 60, 72] as const;
export type SpaceScalePx = (typeof SPACE_SCALE_PX)[number];
