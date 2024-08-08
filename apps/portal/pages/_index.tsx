import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import AuthAC from '../store/auth/actions/AuthAC';
import { getDriveUser } from '../app/services/google/user';
import { ResStatusEnum } from '../app/interfaces/IApiResponse';
import useFetchWorkspacesData from 'hooks/useFetchWorkspacesData';

const Index = () => {
  const dispatch = useDispatch();
  const driveUser = useSelector(
    (state: RootStateOrAny) => state.auth.driveUser,
  );

  useFetchWorkspacesData();

  useEffect(() => {
    const fetchData = async () => {
      const response = await getDriveUser();

      if (
        response.status !== ResStatusEnum.error &&
        response.data &&
        !driveUser
      ) {
        dispatch(AuthAC.setDriveUser({ driveUser: response.data }));
      }
    };
    fetchData();
  }, [driveUser, dispatch]);

  return null;
};

export default Index;
