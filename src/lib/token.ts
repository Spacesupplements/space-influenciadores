import { randomBytes } from "node:crypto";

// 128 bits aleatórios: inviável de adivinhar, curto o bastante pra caber num link de WhatsApp.
export function novoTokenAcesso(): string {
  return randomBytes(16).toString("base64url");
}
