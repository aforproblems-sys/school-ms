import { redirect } from "next/navigation";

export default function DashboardCatchAll({
  params,
}: {
  params: { path: string[] };
}) {
  redirect("/" + params.path.join("/"));
}
