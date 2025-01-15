import React, { FC, useEffect, useState } from 'react';
import WhiteboardsTopbar from 'components/pagesComponents/_whiteboardsScreen/WhiteboardTopbar/WhiteboardTopbar';
import WhiteboardsSidebar from 'components/pagesComponents/_whiteboardsScreen/WhiteboardSidebar/WhiteboardSidebar';
import WhiteboardContainer from 'components/pagesComponents/_whiteboardsScreen/WhiteboardContainer/WhiteboardContainer';
import CreateNewWhiteboardModal from 'components/pagesComponents/_whiteboardsScreen/WhiteboardModals/NewWhiteboardModal/NewWhiteboardModal';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import WhiteboardAC from 'app/store/whiteboard/actions/WhiteboardAC';
import {
  errorMessage,
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import { IWhiteboard } from 'app/interfaces/IWhiteboard';
import {
  createNewWhiteboard,
  getUserWhiteboards,
} from 'app/services/whiteboards';

const WhiteboardsScreen: FC = () => {
  const dispatch = useDispatch();
  const [currentTab, setCurrentTab] = useState<string>('1');
  const whiteboards: IWhiteboard[] = useSelector(
    (state: RootStateOrAny) => state.whiteboard.whiteboards,
  );
  const loading: boolean = useSelector(
    (state: RootStateOrAny) => state.whiteboard.loading,
  );

  const [whiteboardModalVisibility, setWhiteboardModalVisibility] =
    useState<boolean>(false);

  const createWhiteboardHandler = async (name: string) => {
    setWhiteboardModalVisibility(false);
    const id = loadingMessage();
    const data: IWhiteboard | null = await createNewWhiteboard(name);
    if (!data)
      return updateMessage(id, 'Error while creating whiteboard!', 'error');

    dispatch(WhiteboardAC.addWhiteboard({ whiteboard: data }));
    updateMessage(id, 'Successfully created whiteboard!', 'success');
  };

  const fetchUserWhiteboards = async () => {
    dispatch(WhiteboardAC.setLoading(true));
    const data: IWhiteboard[] | null = await getUserWhiteboards();
    data && dispatch(WhiteboardAC.setWhiteboards({ whiteboards: data }));
    dispatch(WhiteboardAC.setLoading(false));
  };

  useEffect(() => {
    fetchUserWhiteboards();
  }, []);

  useEffect(() => {
    const local = localStorage.getItem('localTab');
    if (local) {
      setCurrentTab(local);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('localTab', currentTab);
  }, [currentTab]);

  return (
    <div
      className="whiteboards !tw-overflow-hidden"
      style={{ height: '100vh' }}
    >
      <WhiteboardsTopbar />
      <div className="tw-h-full tw-w-full tw-flex tw-pl-280px !tw-overflow-hidden">
        <WhiteboardsSidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          addNew={setWhiteboardModalVisibility}
        />
        <WhiteboardContainer
          currentTab={currentTab}
          whiteboards={whiteboards}
        />
      </div>

      <CreateNewWhiteboardModal
        visible={whiteboardModalVisibility}
        onClose={() => {
          setWhiteboardModalVisibility(false);
        }}
        onOk={createWhiteboardHandler}
      />
      <AppSpinner show={loading} />
    </div>
  );
};

export default WhiteboardsScreen;
