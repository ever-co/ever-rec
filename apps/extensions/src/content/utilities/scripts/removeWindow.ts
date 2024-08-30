import browser from '@/app/utilities/browser';

const removeWindow = async (winId: number) => {
  try {
    await browser.windows.remove(winId);
  } catch (e) {
    console.log(e);
  }
};

export default removeWindow;
