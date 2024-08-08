const getPercentageFromRange = (value: number, maxValue: number) => {
  let percentage = ((value / maxValue) * 100).toFixed(0);
  if (parseInt(percentage) > 100) percentage = '100';

  return percentage;
};

export default getPercentageFromRange;
