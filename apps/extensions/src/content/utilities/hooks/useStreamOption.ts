import { useState, useEffect } from 'react';
import { setStorageItems, getStorageItems } from '@/app/services/localStorage';

// TODO: default env var
const useStreamOption = () => {
  const [streamOption, setStreamOption] = useState<boolean>(false);

  const handleStreamOptionChange = async (checked: boolean) => {
    try {
      await setStorageItems({ streamOption: checked });
      setStreamOption(checked);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getStorageItems('streamOption')
      .then((values: { [streamOption: string]: boolean }) => {
        if (!Object.prototype.hasOwnProperty.call(values, 'streamOption'))
          return setStreamOption(true); // TODO: default env var
        setStreamOption(values.streamOption);
      })
      .catch((error) => console.log(error));
  }, []);

  return { streamOption, handleStreamOptionChange };
};

export default useStreamOption;
