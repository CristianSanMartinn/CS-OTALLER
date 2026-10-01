import {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Search, Inbox, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
export function PageHeading({
  eyebrow = "GESTIÓN DEL TALLER",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>
        {label}
        {props.required && " *"}
      </span>
      <input {...props} />
    </label>
  );
}
export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="field">
      <span>
        {label}
        {props.required && " *"}
      </span>
      <select {...props}>{children}</select>
    </label>
  );
}
export function TextField({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="field full">
      <span>{label}</span>
      <textarea rows={3} {...props} />
    </label>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function EmptyState({
  title = "No hay resultados",
  description = "Prueba con otros filtros o agrega un nuevo registro.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Breadcrumb({
  label,
  href,
  current,
}: {
  label: string;
  href: string;
  current: string;
}) {
  return (
    <nav className="breadcrumb" aria-label="Ubicación">
      <Link href={href}>{label}</Link>
      <ChevronRight size={14} />
      <span>{current}</span>
    </nav>
  );
}
export function Avatar({ name, src }: { name: string; src?: string }) {
  return (
    <span className="avatar">
      {src ? (
        <Image unoptimized src={src} alt="" width={48} height={48} />
      ) : (
        name
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
      )}
    </span>
  );
}
export function DetailGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="detail-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
