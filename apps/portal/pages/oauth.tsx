// import { useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import AuthAC from 'store/auth/actions/AuthAC';
import { completeOAuth } from '../app/services/api/auth';
import { setDriveUser } from '../app/services/google/user';
import { sendExternalMessage } from '../misc/_helper';
import { ResStatusEnum } from '../app/interfaces/IApiResponse';

const Oauth = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    if (router.isReady && router.query.code) {
      const getOAuth2Creds = async () => {
        const { code, state } = router.query;
        let deserializedState;
        if (state) {
          deserializedState = JSON.parse(state as string);
        }
        const response = await completeOAuth(code);
        if (response.status !== ResStatusEnum.error) {
          await setDriveUser(response.data);
          dispatch(
            AuthAC.setDriveUser({
              driveUser: response.data,
            }),
          );
          sendExternalMessage('setDriveUser', response.data);
          state && router.push(deserializedState.origin);
        }
      };
      getOAuth2Creds();
    } else {
      // window.close()
    }
  }, [router.query, router.isReady]);

  return null;
};

export default Oauth;
