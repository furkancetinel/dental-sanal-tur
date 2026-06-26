import { isAuthenticated } from "@/lib/auth";
import { getAllKlinikler } from "@/lib/config";
import AdminClient from "./AdminClient";
import LoginForm from "./LoginForm";

export default async function AdminPage() {
  const auth = await isAuthenticated();
  if (!auth) return <LoginForm />;
  const klinikler = getAllKlinikler();
  return <AdminClient initialKlinikler={klinikler} />;
}
