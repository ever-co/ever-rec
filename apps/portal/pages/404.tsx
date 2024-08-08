import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function Custom404() {
  const router = useRouter();

  useEffect(() => {
    router.push('/');
  }, []);
  return <AppSpinner show={true} />;
}

export default Custom404;
