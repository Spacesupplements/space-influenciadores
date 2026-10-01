"use client";

import { useState } from "react";

export function BotaoCopiar({ texto, rotulo, grande }: { texto: string; rotulo: string; grande?: boolean }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o texto abaixo:", texto);
    }
  }

  return (
    <button
      className={grande ? "btn" : "mini"}
      style={grande ? { width: "100%" } : undefined}
      onClick={copiar}
    >
      {copiado ? "Copiado ✓" : rotulo}
    </button>
  );
}
