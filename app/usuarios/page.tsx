import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import UsersManager from "@/components/ceicim/users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "administrador") redirect("/dashboard");
  return <UsersManager currentUserId={user.id} />;
}
