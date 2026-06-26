import { isAuthenticated } from "@/lib/auth";
import { getAllKlinikler } from "@/lib/config";
import AdminClient from "./AdminClient";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    const auth = await isAuthenticated();
    if (!auth) return <LoginForm />;
    const klinikler = getAllKlinikler();
    return <AdminClient initialKlinikler={klinikler} />;
  } catch (e) {
    return <LoginForm />;
  }
}
