export const isWithin7Days = (date) => {
  const today = new Date();
  const max = new Date();
  max.setDate(today.getDate() + 7);

  const target = new Date(date);
  return target >= today && target <= max;
};
