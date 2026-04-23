/**
 * Builds a booking path for a given business slug.
 *
 * @example
 * bookingPath('minha-empresa')             → '/agendar/minha-empresa'
 * bookingPath('minha-empresa', 'servico/123') → '/agendar/minha-empresa/servico/123'
 */
export function bookingPath(slug: string, segment = ''): string {
  const base = `/agendar/${slug}`
  return segment ? `${base}/${segment}` : base
}
