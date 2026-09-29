// app/admin/subjects/page.tsx
import React from "react";
import { getSubjects } from "@/lib/google-sheets/reader";
import { AdminSubjectsClient } from "@/components/admin/admin-subjects-client";

export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage() {
  const subjects = await getSubjects();

  return <AdminSubjectsClient subjects={subjects} />;
}
