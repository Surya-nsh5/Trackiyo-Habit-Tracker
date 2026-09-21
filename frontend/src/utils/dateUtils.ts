import { addMonths, subMonths, format, parseISO } from 'date-fns';

export const getNextMonthId = (currentMonthId: string) => {
  const date = parseISO(`${currentMonthId}-01`);
  return format(addMonths(date, 1), 'yyyy-MM');
};

export const getPrevMonthId = (currentMonthId: string) => {
  const date = parseISO(`${currentMonthId}-01`);
  return format(subMonths(date, 1), 'yyyy-MM');
};

export const formatMonthDisplay = (monthId: string) => {
  const date = parseISO(`${monthId}-01`);
  return format(date, 'MMMM yyyy');
};
