import { VelvetApp } from "@/components/velvet-app";
import { ShowcaseHome } from "@/components/showcase-home";
import { redirect } from "next/navigation";

export default async function CatchAllPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (!slug?.length) redirect("/projects/new");
  if (slug[0] === "showcase") return <ShowcaseHome />;
  return <VelvetApp />;
}
