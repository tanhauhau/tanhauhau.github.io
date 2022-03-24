
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

export function formatDate(dateStr: string) {
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7));
  const date = Number(dateStr.slice(8, 10));

  return `${months[month - 1]} ${date}, ${year}`
}