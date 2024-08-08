const videoDurationConverter = (length: number) => {
  const date = new Date(0);
  date.setSeconds(length);
  let durationMain = date.toISOString().substr(11, 8);
  durationMain = durationMain.substr(3, durationMain.length);

  return durationMain;
};

export { videoDurationConverter };
