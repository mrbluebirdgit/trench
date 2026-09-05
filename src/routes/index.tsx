import { createFileRoute } from "@tanstack/react-router";
import { Desk } from "@/components/desk/desk";
import { getMarket } from "@/lib/trench/api";

export const Route = createFileRoute("/")({
  loader: () => getMarket(),
  staleTime: 8_000,
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  return <Desk initial={initial} />;
}
