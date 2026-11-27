import { useCallback, useEffect, useState } from 'react';
import { Modal, Select } from 'antd';
import AppButton from 'components/controls/AppButton';
import {
  errorMessage,
  infoMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import { RootStateOrAny, useSelector } from 'react-redux';
import {
  jiraIssueWithAttachment,
  jiraProjectsData,
} from 'app/services/general';
import AppInput from 'components/controls/AppInput';
import { ResStatusEnum } from 'app/interfaces/IApiResponse';
import AppSpinnerLocal from 'components/containers/appSpinnerLocal/AppSpinnerLocal';
import AppTextArea from 'components/controls/AppTextArea';
import { useTranslation } from 'react-i18next';

interface ICreateJiraTicketModalProps {
  selectedItem: any;
  type?: string;
  onCancel: () => void;
  user: any;
}

const CreateJiraTicketModal: React.FC<ICreateJiraTicketModalProps> = ({
  onCancel,
  selectedItem,
  user,
  type = 'image',
}) => {
  const { t } = useTranslation();
  const [selectedProject, setSelectedProject] = useState<null | string>(null);
  const [selectedResource, setSelectedResource] = useState<null | string>(null);
  const [selectedIssueType, setSelectedIssueType] = useState(null);
  const [description, setSelectedDescription] = useState('');
  const [title, setSelectedTitle] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [projectLoading, setProjectLoading] = useState<boolean>(false);

  const [resource, setResource] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);

  const jiraProjectData = useSelector(
    (state: RootStateOrAny) => state.panel.jiraData,
  );

  useEffect(() => {
    if (jiraProjectData && jiraProjectData.length == 0) {
      (async function () {
        setProjectLoading(true);
        await jiraProjectsData();
        setProjectLoading(false);
      })();
    } else {
      setResource(jiraProjectData);
    }
  }, [jiraProjectData, user]);

  const updateIssueList = useCallback(
    (value) => {
      let listIssueTypes: any[] = [];
      projects.map((item) => {
        if (item.id == value) {
          listIssueTypes = item.issueTypes
            .map((item) => {
              if (item.subtask) return null;
              if (item.name == 'Story') return null;
              return item;
            })
            .filter((element) => {
              return element !== null;
            });
        }
      });
      setIssueTypes(listIssueTypes);
    },
    [projects, setIssueTypes],
  );

  const updateProjectList = useCallback(
    (value) => {
      let listProjects: any[] = [];
      resource.map((item) => {
        if (item.id == value) {
          listProjects = item.projects;
        }
      });
      setProjects(listProjects);
    },
    [resource, setProjects],
  );

  const handleOnsubmit = useCallback(async () => {
    if (selectedIssueType && selectedProject && selectedResource && title) {
      try {
        setLoading(true);
        if (
          type == 'video' &&
          selectedItem.item.dbData &&
          selectedItem.item.dbData.streamData &&
          !selectedItem.item.dbData.streamData.downloadUrl
        ) {
          infoMessage(t('toasts.uploadingVideo'));
          setLoading(false);
          return;
        }
        const res = await jiraIssueWithAttachment({
          itemId: selectedItem.item.dbData.id,
          itemType: type,
          resourceId: selectedResource,
          projectId: selectedProject,
          issueType: selectedIssueType,
          description,
          title,
        });

        if (res && res.status == ResStatusEnum.success) {
          infoMessage(res.message);
          if (res.data && res.data.key) {
            const selectedResourceData = resource.find(
              (item) => (item.id = selectedResource),
            );
            if (selectedResourceData) {
              const jiraIssueLink = `${selectedResourceData.url}/browse/${res.data.key}`;
              await navigator.clipboard.writeText(jiraIssueLink);
              successMessage(t('toasts.jiraIssueLinkCopied'));
            }
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
    } else {
      errorMessage(t('toasts.selectOptions'));
    }
  }, [
    selectedIssueType,
    selectedProject,
    selectedResource,
    selectedItem,
    title,
    type,
    description,
    resource,
  ]);

  return (
    <Modal
      open={true}
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-6">
          <AppButton
            onClick={onCancel}
            outlined
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
          >
            {t('common.cancel')}
          </AppButton>
          <AppButton
            onClick={handleOnsubmit}
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
            disabled={loading}
          >
            {t('common.create')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-4 tw-pr-6 tw-text-base tw-font-semibold">
        {t('modals.createJira')}
      </h2>

      <label className="tw-mb-1 tw-block tw-text-[13px] tw-font-medium tw-text-foreground">
        {t('modals.selectResource')}
      </label>
      <Select
        value={selectedResource}
        size="large"
        placeholder={t('modals.selectAOption')}
        style={{ marginBottom: '1rem' }}
        className="tw-mb-8 tw-w-full tw-rounded-md tw-border tw-border-solid tw-border-input [&.ant-select-focused]:tw-border-ring [&.ant-select-focused]:tw-ring-2 [&.ant-select-focused]:tw-ring-ring/20"
        notFoundContent={
          !resource ? (
            <div style={{ width: '23px', height: '23px', margin: '1rem auto' }}>
              <AppSpinnerLocal />
            </div>
          ) : undefined
        }
        onChange={(value: string) => {
          setError(null);
          setSelectedResource(value);
          updateProjectList(value);
        }}
      >
        {resource &&
          resource.map((board, index) => (
            <Select.Option
              key={`board_${index}`}
              value={board.id}
              className="app-selectable"
            >
              {board.name}
            </Select.Option>
          ))}
      </Select>

      <label className="tw-mb-1 tw-block tw-text-[13px] tw-font-medium tw-text-foreground">
        {t('modals.selectProject')}
      </label>

      <Select
        value={selectedProject}
        size="large"
        placeholder={t('modals.selectAOption')}
        style={{ marginBottom: '1rem' }}
        className="tw-w-full tw-rounded-md tw-border tw-border-solid tw-border-input [&.ant-select-focused]:tw-border-ring [&.ant-select-focused]:tw-ring-2 [&.ant-select-focused]:tw-ring-ring/20"
        onChange={(value: string) => {
          setError(null);
          setSelectedProject(value);
          updateIssueList(value);
        }}
      >
        {projects &&
          projects.map((project, index) => (
            <Select.Option
              key={`project${index}`}
              value={project.id}
              className="app-selectable"
            >
              {project.name}
            </Select.Option>
          ))}
      </Select>

      <label className="tw-mb-1 tw-block tw-text-[13px] tw-font-medium tw-text-foreground">
        {t('modals.selectIssueType')}
      </label>

      <Select
        value={selectedIssueType}
        size="large"
        placeholder={t('modals.selectAOption')}
        style={{ marginBottom: '1rem' }}
        className="tw-w-full tw-rounded-md tw-border tw-border-solid tw-border-input [&.ant-select-focused]:tw-border-ring [&.ant-select-focused]:tw-ring-2 [&.ant-select-focused]:tw-ring-ring/20"
        onChange={(value) => {
          setError(null);
          setSelectedIssueType(value);
        }}
      >
        {issueTypes &&
          issueTypes.map((issueType, index) => (
            <Select.Option
              key={`issueType${index}`}
              value={issueType.id}
              className="app-selectable"
            >
              {issueType.name}
            </Select.Option>
          ))}
      </Select>

      <AppInput
        value={title}
        placeholder={t('modals.titleSummary')}
        className="tw-mb-2 tw-w-full"
        onChange={(e) => setSelectedTitle(e.value)}
      />

      <AppTextArea
        value={description}
        canResize={false}
        placeholder={t('modals.cardDescription')}
        className="tw-mt-3 tw-w-full"
        inputClass="scroll-div"
        dense
        onChange={(e) => setSelectedDescription(e.value)}
      />

      <AppSpinner show={projectLoading} local={true} />
    </Modal>
  );
};

export default CreateJiraTicketModal;
