import { VelvetApp } from "@/components/velvet-app";
import { redirect } from "next/navigation";

export default async function CatchAllPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (!slug?.length) redirect("/projects/new");
  return <VelvetApp />;
}
