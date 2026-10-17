import { HttpErrorResponse } from '@angular/common/http';

/** Extrai uma mensagem legível de um erro HTTP. */
export function apiErrorMessage(error: unknown, fallback = 'Não foi possível concluir a operação.'): string {
  if (error instanceof HttpErrorResponse) {
    const message = (error.error as { message?: unknown } | null)?.message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}
