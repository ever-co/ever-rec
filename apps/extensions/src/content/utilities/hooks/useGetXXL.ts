import useWindowDimensions from './useWindowDimensions';

// This is some quick solution to fix items displaying for screen resolutions bigger than full hd.
// The magic numbers are xxl property for antd grid  https://ant.design/components/grid
const useGetXXL = () => {
  const { width } = useWindowDimensions();

  let xxl = 6;
  if (width > 1920) {
    xxl = 4;
  }

  const dimensionsDashboard = { sidebar: 5, items: 19 };
  if (width > 1920) {
    dimensionsDashboard.sidebar = 3;
    dimensionsDashboard.items = 21;
  }

  return { xxl, dimensionsDashboard };
};

export default useGetXXL;
