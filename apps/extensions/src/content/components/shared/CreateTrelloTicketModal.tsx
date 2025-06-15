import { useCallback, useEffect, useState } from 'react';
import { Modal, Select } from 'antd';
import { ITrelloData } from '@/app/interfaces/IIntegrationTypes';
import { ResStatusEnum } from '@/app/interfaces/IDataResponse';
import {
  trelloProjectsData,
  trelloIssueWithAttachment,
} from '@/app/services/general';
import {
  infoMessage,
  errorMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
import AppInput from '../controls/appInput/AppInput';
import AppTextArea from '../controls/appTextarea/AppTextArea';
import AppButton from '../controls/appButton/AppButton';
import AppSpinner from '../containers/appSpinner/AppSpinner';
import AppSpinnerLocal from '../containers/appSpinnerLocal/AppSpinnerLocal';
import { useTranslation } from 'react-i18next';

interface ICreateTrelloTicketModalProps {
  user: any;
  selectedItem: any;
  type?: string;
  onCancel: () => void;
}

const CreateTrelloTicketModal: React.FC<ICreateTrelloTicketModalProps> = ({
  user,
  selectedItem,
  type = 'image',
  onCancel,
}) => {
  const { t } = useTranslation();
  const [boards, setBoards] = useState<any[] | null>(null);
  const [issueList, setIssueList] = useState<any[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(
    null,
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const isFormValid = !!selectedBoard && !!selectedIssueType && !!title;

  // const trelloProjectData: ITrelloData = useSelector(
  //   (state: RootStateOrAny) => state.panel.trelloData,
  // );

  useEffect(() => {
    (async function () {
      const data = await trelloProjectsData();
      setBoards(data);
    })();
  }, []);

  const handleOnSubmit = useCallback(async () => {
    if (!isFormValid) return;

    try {
      setLoading(true);
      if (
        type == 'video' &&
        selectedItem.item.dbData?.streamData &&
        selectedItem.item.dbData.streamData.downloadUrl == ''
      ) {
        infoMessage(t('toasts.uploadingVideo'));
        return;
      }

      const res = await trelloIssueWithAttachment({
        itemId: selectedItem.item.dbData.id,
        itemType: type,
        projectId: selectedBoard,
        issueType: selectedIssueType,
        description,
        title,
      });

      if (res && res.status === ResStatusEnum.success) {
        infoMessage(res.message);
        if (res.data && res.data.url) {
          navigator.clipboard.writeText(res.data.url);
          successMessage(t('toasts.uploadingVideo'));
        }

        onCancel();
      } else {
        if (res && res.message) {
          errorMessage(res.message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [
    isFormValid,
    selectedBoard,
    selectedIssueType,
    title,
    description,
    type,
    selectedItem.item.dbData.streamData,
    selectedItem.item.dbData.id,
    onCancel,
  ]);

  const updateListData = useCallback(
    (value) => {
      let listRes: any[] = [];

      boards &&
        boards.find((item) => {
          if (item.id == value) {
            listRes = item.list;
          }
        });

      setIssueList(listRes);
    },
    [boards],
  );

  return (
    <Modal
      visible
      onCancel={onCancel}
      footer={
        <Footer
          hideBoardsText={boards === null || boards.length > 0}
          isFormValid={isFormValid}
          projectLoading={loading}
          handleOnSubmit={handleOnSubmit}
          onCancel={onCancel}
        />
      }
    >
      <h2 className="tw-mb-4 tw-text-2xl tw-font-semibold">
        {t('modals.createTrello')}
      </h2>

      <label className="tw-mb-1">{t('modals.selectBoard')}</label>
      <Select
        value={selectedBoard}
        size="large"
        placeholder={t('modals.selectAOption')}
        style={{ marginBottom: '1rem' }}
        className="tw-w-full tw-bg-white tw-rounded"
        notFoundContent={
          !boards ? (
            <div style={{ width: '23px', height: '23px', margin: '1rem auto' }}>
              <AppSpinnerLocal
                circleColor="#5b4dbe"
                circleInnerColor="#ffffff"
              />
            </div>
          ) : undefined
        }
        onChange={(value) => {
          setSelectedBoard(value);
          updateListData(value);
        }}
      >
        {boards &&
          boards.map((board, index) => (
            <Select.Option
              key={`board_${index}`}
              value={board.id}
              className="app-selectable"
            >
              {board.name}
            </Select.Option>
          ))}
      </Select>

      <label>{t('modals.selectIssueType')}</label>
      <Select
        value={selectedIssueType}
        size="large"
        placeholder={t('modals.selectAOption')}
        style={{ marginBottom: '1rem' }}
        className="tw-w-full tw-bg-white tw-rounded"
        onChange={(value) => {
          setSelectedIssueType(value);
        }}
      >
        {issueList.map((issue, index) => (
          <Select.Option
            key={`board_${index}`}
            value={issue.id}
            className="app-selectable"
          >
            {issue.name}
          </Select.Option>
        ))}
      </Select>

      <AppInput
        value={title}
        placeholder={t('modals.titleSummary')}
        className="tw-w-full"
        inputClass="tw-bg-transparent tw-border-mid-grey tw-placeholder-black"
        onChange={(e) => setTitle(e.value)}
      />

      <AppTextArea
        value={description}
        canResize={false}
        placeholder={t('modals.cardDescription')}
        className="tw-mt-6 tw-w-full"
        inputClass="scroll-div tw-bg-transparent tw-border-mid-grey tw-placeholder-black tw-outline-none"
        onChange={(e) => setDescription(e.value)}
      />

      <AppSpinner show={loading} local />
    </Modal>
  );
};

export default CreateTrelloTicketModal;

interface IFooterProps {
  hideBoardsText: boolean;
  isFormValid: boolean;
  projectLoading: boolean;
  handleOnSubmit: () => void;
  onCancel: () => void;
}

const Footer: React.FC<IFooterProps> = ({
  hideBoardsText,
  isFormValid,
  projectLoading,
  handleOnSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  return (
    <div className="tw-flex tw-justify-between tw-items-center tw-mt-8">
      {hideBoardsText ? (
        <div></div>
      ) : (
        <p className="tw-text-sm tw-text-center">
          {t('modals.noTrelloBoards')}
        </p>
      )}

      <div className="tw-flex">
        <AppButton
          outlined
          bgColor="tw-bg-app-grey-darker"
          className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </AppButton>

        <AppButton
          className="tw-px-8 tw-pb-1 tw-pt-1"
          disabled={projectLoading || !isFormValid}
          onClick={handleOnSubmit}
        >
          {t('common.create')}
        </AppButton>
      </div>
    </div>
  );
};
