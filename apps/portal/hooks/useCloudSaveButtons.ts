import React, { useCallback, useRef } from 'react';

interface Props {
  hiddenClass: string;
  activeClass: string;
}
const useCloudSaveButtons = ({ hiddenClass, activeClass }: Props) => {
  const cloudRef1 = useRef<HTMLDivElement>(null);
  const cloudRef2 = useRef<HTMLDivElement>(null);
  const cloudRef3 = useRef<HTMLDivElement>(null);
  const cloudRef4 = useRef<HTMLDivElement>(null);
  const cloudBtnsRefs: React.RefObject<HTMLDivElement>[] = [
    cloudRef1,
    cloudRef2,
    cloudRef3,
    cloudRef4,
  ];

  const onMouseEnterCloudButtonsHandler = useCallback(
    (index: number) => {
      cloudBtnsRefs.forEach((x, i) => {
        if (i !== index) {
          x.current?.classList.add(hiddenClass);
        } else {
          x.current?.classList.add(activeClass);
        }
      });
    },
    [
      cloudRef1.current,
      cloudRef2.current,
      cloudRef3.current,
      cloudRef4.current,
    ],
  );

  const onMouseLeaveCloudButtonsHandler = useCallback(() => {
    cloudBtnsRefs.forEach((x) => {
      x.current?.classList.remove(activeClass);
      x.current?.classList.remove(hiddenClass);
    });
  }, [
    cloudRef1.current,
    cloudRef2.current,
    cloudRef3.current,
    cloudRef4.current,
  ]);

  return {
    cloudBtnsRefs,
    onMouseEnterCloudButtonsHandler,
    onMouseLeaveCloudButtonsHandler,
  };
};

export default useCloudSaveButtons;
