import { tv as tvBase, type TV } from "tailwind-variants";

export const tv: TV = (options, config) =>
  tvBase(options, {
    ...config,
    twMerge: true,
  });
