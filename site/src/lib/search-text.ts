/** Strip markdown noise so ingredients and steps are searchable. */
export function markdownToSearchText(raw: string): string {
  return raw
    .replace(/^#.+$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/[#>*_\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchText(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
