export const changeWheelSpeed = (element: Element, speedY: number) => {
  let removed = false;
  let scrollY = 0;

  const handleScrollReset = () => {
    scrollY = element.scrollTop;
  };

  const handleMouseWheel = (e: any) => {
    e.preventDefault();

    scrollY += speedY * e.deltaY;
    if (scrollY < 0) {
      scrollY = 0;
    } else {
      const limitY = element.scrollHeight - element.clientHeight;

      if (scrollY > limitY) {
        scrollY = limitY;
      }
    }

    element.scrollTop = scrollY;
  };

  element.addEventListener('mouseup', handleScrollReset, false);
  element.addEventListener('mousedown', handleScrollReset, false);
  element.addEventListener('mousewheel', handleMouseWheel, false);

  return function () {
    if (removed) return;

    element.removeEventListener('mouseup', handleScrollReset, false);
    element.removeEventListener('mousedown', handleScrollReset, false);
    element.removeEventListener('mousewheel', handleMouseWheel, false);

    removed = true;
  };
};
