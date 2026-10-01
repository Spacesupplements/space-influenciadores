export const TIPOS_PIX = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Celular",
  aleatoria: "Chave aleatória",
} as const;

export type TipoPix = keyof typeof TIPOS_PIX;

function cpfValido(d: string) {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(d[n])) return false;
  }
  return true;
}

function cnpjValido(d: string) {
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string, pesos: number[]) => {
    const r = base.split("").reduce((s, x, i) => s + Number(x) * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = calc(d.slice(0, 12), p1);
  const dv2 = calc(d.slice(0, 13), [6, ...p1]);
  return dv1 === Number(d[12]) && dv2 === Number(d[13]);
}

/**
 * Normaliza e valida a chave no formato que o app do banco aceita ao colar.
 * Retorna { chave } ou { erro } com mensagem para o gestor.
 */
export function normalizarChavePix(tipo: string, entrada: string): { chave: string } | { erro: string } {
  const bruto = entrada.trim();
  const digitos = bruto.replace(/\D/g, "");
  switch (tipo) {
    case "cpf":
      return cpfValido(digitos) ? { chave: digitos } : { erro: "CPF inválido (confira os números)." };
    case "cnpj":
      return cnpjValido(digitos) ? { chave: digitos } : { erro: "CNPJ inválido (confira os números)." };
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bruto)
        ? { chave: bruto.toLowerCase() }
        : { erro: "E-mail inválido." };
    case "telefone": {
      // Aceita "(11) 91234-5678", "11912345678" ou "+55 11 91234-5678"; grava como +55DDDNÚMERO.
      const nacional = digitos.length === 13 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
      return /^\d{2}9\d{8}$/.test(nacional)
        ? { chave: `+55${nacional}` }
        : { erro: "Celular inválido: use DDD + número com 9 dígitos." };
    }
    case "aleatoria":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bruto)
        ? { chave: bruto.toLowerCase() }
        : { erro: "Chave aleatória inválida (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)." };
    default:
      return { erro: "Tipo de chave inválido." };
  }
}

/** Formatação só para exibição (CPF 123.456.789-09, celular (11) 91234-5678 etc.). */
export function formatarChavePix(tipo: string | null, chave: string | null): string {
  if (!chave) return "";
  if (tipo === "cpf" && chave.length === 11)
    return chave.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (tipo === "cnpj" && chave.length === 14)
    return chave.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (tipo === "telefone" && chave.length === 14)
    return chave.replace(/\+55(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  return chave;
}

/** Versão mascarada para o portal (link compartilhável): dá pra reconhecer sem expor o dado inteiro. */
export function mascararChavePix(tipo: string | null, chave: string | null): string {
  if (!chave) return "";
  if (tipo === "cpf" && chave.length === 11) return `***.${chave.slice(3, 6)}.${chave.slice(6, 9)}-**`;
  if (tipo === "cnpj" && chave.length === 14) return `**.${chave.slice(2, 5)}.${chave.slice(5, 8)}/****-**`;
  if (tipo === "telefone") return `(**) *****-${chave.slice(-4)}`;
  if (tipo === "email") {
    const [user, dominio] = chave.split("@");
    return `${user.slice(0, 2)}***@${dominio}`;
  }
  if (tipo === "aleatoria") return `${chave.slice(0, 4)}…${chave.slice(-4)}`;
  return "****";
}
