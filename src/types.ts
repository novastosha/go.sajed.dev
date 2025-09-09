import type { Context } from "hono";

export type AppContext = Context<{ Bindings: Env }>;
export type HandleArgs = [AppContext];

export interface Env {
  SHORTENER_KV: KVNamespace;
  TOKEN_SECRET: string;
}