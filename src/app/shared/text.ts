/** Normaliza texto para busca: minúsculas e sem acentos. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function matches(text: string, query: string): boolean {
  return normalize(text).includes(normalize(query));
}
