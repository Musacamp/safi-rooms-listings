// Temporary type probe — delete after inspection.
import type { Route } from "@/routes/index";

type S = ReturnType<typeof Route.useSearch>;
export const probe: number = {} as S;
