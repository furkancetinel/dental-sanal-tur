import { isAuthenticated } from "@/lib/auth";
import { getAllKlinikler } from "@/lib/config";
import AdminClient from "./AdminClient";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let auth = false;
  try { auth = await isAuthenticated(); } catch {}
  
  if (!auth) return <LoginForm />;

  let klinikler: any[] = [];
  let hata = "";
  try {
    klinikler = getAllKlinikler();
  } catch (e: any) {
    hata = e.message;
  }

  if (hata) {
    return (
      <div style={{ fontFamily: "Poppins, sans-serif", padding: 40 }}>
        <p style={{ color: "red", marginBottom: 8 }}>Hata: {hata}</p>
        <p style={{ color: "#666", fontSize: 13 }}>DATA_DIR kontrol edin</p>
      </div>
    );
  }

  return <AdminClient initialKlinikler={klinikler} />;
}
