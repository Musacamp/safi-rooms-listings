// Temporary type probe — delete after inspection.
import { Route } from "@/routes/index";

const search = Route.useSearch();
export const bad: number = search.type;
