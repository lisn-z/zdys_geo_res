/** Values transcribed from the user's textbook, figure 1-28 (page 28).
 * Unit: 亿年. These belong to that teaching edition, not the current ICS chart.
 * Keep the printed decimal strings: e.g. 0.0258, never 0.258 or 258.
 */
export const textbookAges = [
  '46', '40', '25', '5.41', '4.85', '4.44', '4.19', '3.59',
  '2.99', '2.52', '2.01', '1.45', '0.66', '0.2303', '0.0258',
] as const

export function textbookStartAge(index: number): string {
  return textbookAges[index] ?? ''
}

/** Ma is only the internal numerical unit; all teaching labels use 亿年. */
export function textbookStartMa(index: number): number {
  return index === textbookAges.length ? 0 : Number(textbookStartAge(index)) * 100
}

export function textbookAgeRange(index: number): string {
  const start = textbookStartAge(index)
  const end = textbookStartAge(index + 1)
  if (!start) return ''
  return end ? `距今 ${start}—${end} 亿年` : `距今 ${start} 亿年至今`
}
