"use client";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Wrench, Cog } from "lucide-react";
const visited = new Set<string>();
export function ApplicationLoading({
  rememberKey,
  message = "Preparando tu taller",
  brandName,
  contextLabel = "GESTIÓN AUTOMOTRIZ",
  ready,
  logo,
  children,
}: {
  rememberKey?: string;
  message?: string;
  brandName?: string;
  contextLabel?: string;
  ready: boolean;
  logo?: string;
  children: ReactNode;
}) {
  const [complete, setComplete] = useState(() =>
    Boolean(rememberKey && visited.has(rememberKey)),
  );
  const [minimum, setMinimum] = useState(() =>
    Boolean(rememberKey && visited.has(rememberKey)),
  );
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (complete) return;
    const timer = setTimeout(() => setMinimum(true), 1000);
    return () => clearTimeout(timer);
  }, [complete]);
  useEffect(() => {
    if (complete || !minimum || !ready) return;
    const start = setTimeout(() => setLeaving(true), 0);
    const end = setTimeout(() => {
      if (rememberKey) visited.add(rememberKey);
      setComplete(true);
    }, 250);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [complete, minimum, ready, rememberKey]);
  return (
    <div className={"portal-entrance-shell" + (!complete ? " is-loading" : "")}>
      <div
        className="portal-ready-content"
        hidden={!complete && !leaving}
        inert={!complete}
      >
        {children}
      </div>
      {!complete && (
        <div
          className={"portal-loading-screen" + (leaving ? " is-leaving" : "")}
          role="status"
          aria-live="polite"
          aria-label={message}
        >
          <div className="portal-loading-halo" />
          <div className="portal-loading-composition">
            <div className="portal-loading-tools" aria-hidden="true">
              <Cog className="portal-loading-gear" />
              <Wrench className="portal-loading-wrench" />
              <svg
                className="portal-loading-screwdriver"
                viewBox="0 0 100 100"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M43 6h14l5 12-4 26H42l-4-26z" />
                <path d="M46 17v19m8-19v19M46 44v37l-3 12h14l-3-12V44" />
              </svg>
              <span className="portal-loading-flash" />
            </div>
            <div className="portal-loading-brand">
              {logo ? (
                <Image
                  src={logo}
                  alt="Logo del taller"
                  width={240}
                  height={240}
                  unoptimized
                  priority
                />
              ) : (
                <>
                  <strong
                    className={brandName ? "loading-workshop-name" : undefined}
                  >
                    {brandName || "CSM"}
                  </strong>
                  <span>MECÁNICA AUTOMOTRIZ</span>
                </>
              )}
              <small>C.S.OTALLER · {contextLabel}</small>
            </div>
            <p>{message}</p>
            <div className="portal-loading-line" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
