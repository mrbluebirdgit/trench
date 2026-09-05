import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getMarket = createServerFn({ method: "GET" }).handler(async () => {
  const { loadFeed } = await import("./load.server");
  return loadFeed();
});

export const getToken = createServerFn({ method: "GET" })
  .validator(z.object({ mint: z.string().min(32).max(64) }))
  .handler(async ({ data }) => {
    const { loadToken } = await import("./load.server");
    return loadToken(data.mint);
  });
