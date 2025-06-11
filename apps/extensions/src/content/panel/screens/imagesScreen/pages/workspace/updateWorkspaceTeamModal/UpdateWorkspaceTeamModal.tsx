import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import * as styles from './UpdateWorkspaceTeamModal.module.scss';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { IWorkspaceTeam } from '@/app/interfaces/IWorkspaceTeams';
import { iDataResponseParser } from '@/app/services/helpers/iDataResponseParser';
import {
  errorMessage,
  infoMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
import { deleteWorkspaceTeam } from '@/app/services/workspaceTeams';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import AppSpinnerLocal from '@/content/components/containers/appSpinnerLocal/AppSpinnerLocal';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppSvg from '@/content/components/elements/AppSvg';
import { Modal } from 'antd';
import { useDispatch } from 'react-redux';
import { updateWorkspaceTeamAPI } from '@/app/services/api/workspaceTeams';
import { useTranslation } from 'react-i18next';

interface IProps {
  workspace: IWorkspace | null;
  team: IWorkspaceTeam | null;
  isAdmin: boolean;
  visible: boolean;
  onCancel: () => void;
}

const UpdateWorkspaceTeamModal: React.FC<IProps> = ({
  workspace,
  team,
  isAdmin,
  visible,
  onCancel,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const teamNameRef = useRef<string>('');
  const iconUploadRef = useRef<HTMLInputElement | null>(null);
  const thumbnailUploadRef = useRef<HTMLInputElement | null>(null);
  const avatarImgRef = useRef<HTMLImageElement | null>(null);
  const thumbnailImgRef = useRef<HTMLImageElement | null>(null);
  const [saveLoadingTeamName, setSaveLoadingTeamName] = useState(false);
  const [saveLoadingAvatar, setSaveLoadingAvatar] = useState(false);
  const [saveLoadingThumbnail, setSaveLoadingThumbnail] = useState(false);
  const [saveLoadingDeleteTeam, setSaveLoadingDeleteTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [toDeleteTeam, setToDeleteTeam] = useState(false);

  useEffect(() => {
    if (!team?.name) return;
    setTeamName(team.name);
    teamNameRef.current = team.name;
  }, [team]);

  const uploadAvatarHandler = useCallback(() => {
    iconUploadRef.current?.click();
  }, []);

  const uploadThumbnailHandler = useCallback(() => {
    thumbnailUploadRef.current?.click();
  }, []);

  const resetTeamName = () => {
    if (!teamNameRef.current) return;
    setTeamName(teamNameRef.current);
  };

  const resetAvatar = () => {
    if (avatarImgRef.current) {
      avatarImgRef.current.src = team?.avatar || '/common/team-icon.svg';
      setAvatar(null);
    }
  };

  const resetThumbnail = () => {
    if (thumbnailImgRef.current) {
      thumbnailImgRef.current.src = team?.thumbnail || '/common/Thumbnail.svg';
      setThumbnail(null);
    }
  };

  const processAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && avatarImgRef.current) {
      if (e.target.files[0].size > 30000) {
        return errorMessage(t('toasts.fileTooLarge'));
      }

      avatarImgRef.current.src = URL.createObjectURL(e.target.files[0]);
      setAvatar(e.target.files[0]);
    }
  };

  const processThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && thumbnailImgRef.current) {
      thumbnailImgRef.current.src = URL.createObjectURL(e.target.files[0]);
      setThumbnail(e.target.files[0]);
    }
  };

  const updateInfo = async (
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    clearState?: React.Dispatch<React.SetStateAction<File | null>>,
  ) => {
    if (team && workspace) {
      setLoading(true);
      const response = await updateWorkspaceTeamAPI({
        workspaceId: workspace.id,
        teamId: team.id,
        name: teamName,
        avatar: avatar || undefined,
        thumbnail: thumbnail || undefined,
      });
      const data = iDataResponseParser<typeof response.data>(response);

      if (data) {
        const teamIndex = workspace?.teams?.findIndex((x) => x.id === team.id);

        if (teamIndex !== undefined && teamIndex !== -1) {
          workspace.teams[teamIndex] = data;
        }
      }

      teamNameRef.current = teamName;
      dispatch(
        PanelAC.setActiveWorkspace({ activeWorkspace: { ...workspace } }),
      );
      setLoading(false);
      clearState && clearState(null);
      successMessage(t('toasts.teamUpdated'));
    }
  };

  const deleteTeamHandler = async (initialClick = true) => {
    if (!workspace) return;
    if (!team) return;
    if (initialClick) return setToDeleteTeam(true);

    setSaveLoadingDeleteTeam(true);

    const data = await deleteWorkspaceTeam(workspace.id, team.id);
    if (!data) return;

    const newTeams = !data.length ? null : data; // lets have it as a null for the logic for empty teams UI state

    dispatch(
      PanelAC.setActiveWorkspace({
        // @ts-ignore
        activeWorkspace: { ...workspace, teams: newTeams },
      }),
    );

    infoMessage(
      t('workspace.team') +
        ` ${team?.name && team.name} ` +
        t('toasts.deletedSuccessfully'),
    );
    onCancelHandler();
  };

  const onCancelHandler = () => {
    setToDeleteTeam(false);
    setSaveLoadingDeleteTeam(false);
    onCancel();
  };

  const onTeamNameChange = (event: any) => {
    const value = event.target.value;
    setTeamName(value);
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      className={styles.modal}
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      footer={<></>}
    >
      <input
        type="file"
        id="file"
        ref={iconUploadRef}
        style={{ display: 'none' }}
        accept="image/jpeg, image/jpg, image/png"
        onChange={processAvatar}
        onClick={(e) => {
          e.currentTarget.value = '';
        }}
      />
      <input
        type="file"
        id="file"
        ref={thumbnailUploadRef}
        style={{ display: 'none' }}
        accept="image/jpeg, image/jpg, image/png"
        onChange={processThumbnail}
        onClick={(e) => {
          e.currentTarget.value = '';
        }}
      />
      <h2 className="tw-text-2xl tw-font-bold tw-mb-10">
        {t('modals.updateTeamSettings')}
      </h2>
      <div className={styles.row}>
        <h4 className={styles.heading}>{t('modals.updateTeamName')}</h4>
        <div className={styles.changeTeamName}>
          <input
            value={teamName}
            onChange={onTeamNameChange}
            className={styles.input}
            type="text"
            placeholder={t('modals.enterTeamName')}
          />
          <div className={styles.iconButtonsWrapper}>
            <AppButton
              disabled={teamName === '' || teamName === teamNameRef.current}
              onClick={() => updateInfo(setSaveLoadingTeamName)}
              className={styles.saveButton}
            >
              {saveLoadingTeamName ? (
                <div className={styles.spinnerWrapper}>
                  <AppSpinnerLocal />
                </div>
              ) : (
                t('common.update')
              )}
            </AppButton>
            <AppButton
              disabled={teamName === '' || teamName === teamNameRef.current}
              onClick={resetTeamName}
              outlined={true}
              className={styles.cancelButton}
            >
              {t('common.reset')}
            </AppButton>
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <h4 className={styles.heading}>{t('modals.updateTeamIcon')}</h4>
        <div className={styles.iconInnerWrapper}>
          <img
            ref={avatarImgRef}
            src={team?.avatar || '/images/panel/common/team-icon.svg'}
            alt="team avatar"
            className={styles.avatar}
            onClick={uploadAvatarHandler}
          />
          <div className={styles.iconButtonsWrapper}>
            <AppButton
              disabled={!avatar}
              onClick={() => updateInfo(setSaveLoadingAvatar, setAvatar)}
              className={styles.saveButton}
            >
              {saveLoadingAvatar ? (
                <div className={styles.spinnerWrapper}>
                  <AppSpinnerLocal />
                </div>
              ) : (
                t('common.update')
              )}
            </AppButton>
            <AppButton
              disabled={!avatar}
              onClick={resetAvatar}
              outlined={true}
              className={styles.cancelButton}
            >
              {t('common.reset')}
            </AppButton>
          </div>
        </div>
        <p className={styles.supportsP}>
          {t('page.image.uploadDescriptionWithLimit')}
        </p>
      </div>
      <div className={styles.row}>
        <h4 className={styles.heading}>{t('modals.updateTeamThumbnail')}</h4>
        <div className={styles.iconInnerWrapper}>
          <img
            ref={thumbnailImgRef}
            src={team?.thumbnail || '/images/panel/common/Thumbnail.svg'}
            alt="team thumbnail"
            className={classNames(
              styles.thumbnail,
              !thumbnail && !team?.thumbnail && styles.imageBorder,
            )}
            onClick={uploadThumbnailHandler}
          />
          <div className={styles.iconButtonsWrapper}>
            <AppButton
              disabled={!thumbnail}
              onClick={() => updateInfo(setSaveLoadingThumbnail, setThumbnail)}
              className={styles.saveButton}
            >
              {saveLoadingThumbnail ? (
                <div className={styles.spinnerWrapper}>
                  <AppSpinnerLocal />
                </div>
              ) : (
                t('common.update')
              )}
            </AppButton>

            <AppButton
              disabled={!thumbnail}
              onClick={resetThumbnail}
              outlined={true}
              className={styles.cancelButton}
            >
              {t('common.reset')}
            </AppButton>
          </div>
        </div>
        <p className={styles.supportsP}>{t('page.image.uploadDescription')}</p>
      </div>
      {isAdmin && (
        <div
          className={classNames(styles.actionWrapper, styles.lastActionWrapper)}
        >
          <div>
            <h4 className={styles.heading}>{t('modals.deleteTeam')}</h4>
            <p className={styles.descriptionP}>
              {t('modals.deleteTeamQuestion')}
            </p>
          </div>
          {!toDeleteTeam && (
            <AppButton
              onClick={deleteTeamHandler}
              className={classNames(styles.dangerButton, styles.deleteTeamBtn)}
            >
              {t('modals.deleteTeam')}
            </AppButton>
          )}
          {toDeleteTeam && (
            <DeleteConfirmButtons
              loading={saveLoadingDeleteTeam}
              onConfirm={() => deleteTeamHandler(false)}
              onCancel={() => (
                setToDeleteTeam(false), setSaveLoadingDeleteTeam(false)
              )}
            />
          )}
        </div>
      )}
    </Modal>
  );
};

export default UpdateWorkspaceTeamModal;

interface DeleteConfirmButtonsProps {
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmButtons: React.FC<DeleteConfirmButtonsProps> = ({
  onConfirm,
  onCancel,
  loading,
}) => {
  const { t } = useTranslation();
  return (
    <div className={styles.toDeleteTeam}>
      <AppButton
        onClick={onConfirm}
        className={classNames(styles.deleteTeamBtn, styles.confirmDelete)}
      >
        {loading ? (
          <div className={styles.spinnerWrapper}>
            <AppSpinnerLocal circleInnerColor="#d70015" />
          </div>
        ) : (
          t('common.confirm')
        )}
      </AppButton>
      <AppButton onClick={() => onCancel()} className="" outlined>
        {t('common.cancel')}
      </AppButton>
    </div>
  );
};
