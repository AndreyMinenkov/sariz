/**
 * Форматирует число в формат "1 000 000,00"
 * @param num Число для форматирования
 * @returns Отформатированная строка
 */
export const formatNumber = (num: number): string => {
  if (num === null || num === undefined || isNaN(num)) return '0,00';
  
  const [integerPart, decimalPart] = num.toFixed(2).split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formattedInteger},${decimalPart}`;
};

/**
 * Форматирует число без копеек (для целых чисел)
 * @param num Число для форматирования
 * @returns Отформатированная строка без десятичной части
 */
export const formatNumberNoCents = (num: number): string => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  const integerPart = Math.round(num).toString();
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/**
 * Форматирует сумму с валютой
 * @param num Сумма
 * @returns Отформатированная сумма с символом рубля
 */
export const formatAmount = (num: number): string => {
  return `${formatNumber(num)} ₽`;
};
