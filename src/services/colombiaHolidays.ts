/**
 * Utilidad de festivos en Colombia para cálculo de programación de clases.
 */
export function getColombiaHolidays(fechaInicio: string): string[] {
  const dateObj = new Date(fechaInicio + 'T00:00:00');
  const year = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : 2026;
  
  const holidays = [
    `${year}-01-01`,
    `${year}-01-12`,
    `${year}-03-23`,
    `${year}-04-02`,
    `${year}-04-03`,
    `${year}-05-01`,
    `${year}-05-18`,
    `${year}-06-08`,
    `${year}-06-15`,
    `${year}-06-29`,
    `${year}-07-20`,
    `${year}-08-07`,
    `${year}-08-17`,
    `${year}-10-12`,
    `${year}-11-02`,
    `${year}-11-16`,
    `${year}-12-08`,
    `${year}-12-25`,
  ];
  return holidays;
}
