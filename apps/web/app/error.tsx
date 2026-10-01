"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h1>No pudimos abrir esta pantalla</h1>
      <p>Vuelve a intentarlo para continuar.</p>
      <button className="button primary" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
