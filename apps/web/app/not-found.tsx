import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Página no encontrada</h1>
      <p>La página que buscas no está disponible.</p>
      <Link className="button primary" href="/dashboard">
        Volver al dashboard
      </Link>
    </div>
  );
}
