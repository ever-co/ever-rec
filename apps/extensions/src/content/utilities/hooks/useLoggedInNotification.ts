import { useEffect } from 'react';
import { successMessage } from '@/app/services/helpers/toastMessages';
import { useLocation } from 'react-router';
import { useSearchParams } from 'react-router-dom';

const useLoggedInNotification = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const justLoggedIn = searchParams.get('justLoggedIn');

    if (justLoggedIn) {
      successMessage('You logged in successfully.');

      // Here I tried deleting the justLoggedIn parameter after the notfication,
      // setSearchParams('') seems to push new state to history object and browser "Back" will not be able to go back to login page.
      // Leaving the parameter there.
    }
  }, [location]);

  return;
};

export default useLoggedInNotification;
