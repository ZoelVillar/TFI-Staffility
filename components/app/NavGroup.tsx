// src/components/app/NavGroup.tsx
"use client";

import Link from "next/link";
import { ChevronUp, ChevronDown } from "lucide-react";

type Item = { label: string; href: string };

export default function NavGroup({
  label,
  icon,
  items,
  open,
  onToggle,
}: {
  label: string;
  icon?: React.ReactNode;
  items: Item[];
  open: boolean; // ← ahora es controlado
  onToggle: () => void; // ← el padre decide qué grupo queda abierto
}) {
  // Verde inglés (botón activo)
  const activeClass =
    "bg-[#1B4D3E] text-white shadow-sm hover:bg-[#174235] border-transparent";
  const idleClass = "bg-white text-gray-800 hover:bg-gray-50 border-gray-200";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
          open ? activeClass : idleClass
        }`}
        aria-expanded={open}
        aria-controls={`menu-${label}`}
      >
        {icon ? <span>{icon}</span> : null}
        <span className="font-medium">{label}</span>
        {/* flecha arriba cuando cerrado, abajo cuando abierto (según tu pedido) */}
        {open ? (
          <ChevronDown className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronUp className="h-4 w-4" aria-hidden />
        )}
      </button>

      {/* Dropdown como tarjeta redondeada */}
      {open && (
        <div
          id={`menu-${label}`}
          className="absolute z-20 mt-2 w-60 rounded-2xl border bg-white shadow-lg p-2"
        >
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-gray-50 transition"
                >
                  <span>{item.label}</span>
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </Link>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">
                Sin opciones disponibles
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
