import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Select } from 'antd';
import {
  jiraProjectsData,
  jiraIssueWithAttachment,
} from '@/app/services/general';
import {
  infoMessage,
  errorMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
import { useSelector, RootStateOrAny } from 'react-redux';
import AppSpinner from '../containers/appSpinner/AppSpinner';
import AppButton from '../controls/appButton/AppButton';
import AppInput from '../controls/appInput/AppInput';
import { ResStatusEnum } from '@/app/interfaces/IDataResponse';
import AppSpinnerLocal from '../containers/appSpinnerLocal/AppSpinnerLocal';
import AppTextArea from '../controls/appTextarea/AppTextArea';

interface ICreateJiraTicketModalProps {
  selectedItem: any;
  type?: any;
  onCancel: () => void;
  user: any;
}

const CreateJiraTicketModal: React.FC<ICreateJiraTicketModalProps> = ({
  onCancel,
  selectedItem,
  user,
  type = 'image',
}) => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(
    null,
  );
  const [title, setSelectedTitle] = useState('');
  const [description, setSelectedDescription] = useState('');
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
      projects.map((item: any) => {
        if (item.id == value) {
          listIssueTypes = item.issueTypes
            .map((item: any) => {
              if (item.subtask) return null;
              if (item.name == 'Story') return null;
              return item;
            })
            .filter((element: any) => {
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
          infoMessage('You will be able to upload video shortly...');
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
              successMessage('Jira issue link Copied to clipboard');
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
      errorMessage('Please select all options');
    }
  }, [
    selectedIssueType,
    selectedProject,
    selectedResource,
    selectedItem,
    type,
    description,
    title,
  ]);

  return (
    <Modal
      visible
      onCancel={onCancel}
      footer={
        <div className="tw-flex tw-justify-end tw-mt-14">
          <AppButton
            onClick={onCancel}
            bgColor="tw-bg-app-grey-darker"
            outlined
            className="tw-px-8 tw-mx-4 tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={handleOnsubmit}
            className="tw-px-8 tw-pb-1 tw-pt-1"
            disabled={loading}
          >
            Create
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-mb-2 tw-text-2xl tw-font-semibold">
        Create Jira issue with selected attachment
      </h2>

      <label>Select resource: *</label>
      <Select
        value={selectedResource}
        size="large"
        placeholder="Please select an option"
        style={{ marginBottom: '1rem' }}
        className="tw-mb-8 tw-w-full tw-bg-white tw-rounded"
        notFoundContent={
          !resource ? (
            <div style={{ width: '23px', height: '23px', margin: '1rem auto' }}>
              <AppSpinnerLocal
                circleColor="#5b4dbe"
                circleInnerColor="#ffffff"
              />
            </div>
          ) : undefined
        }
        onChange={(value: string) => {
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

      <label>Select project: *</label>
      <Select
        value={selectedProject}
        size="large"
        placeholder="Please select an option"
        style={{ marginBottom: '1rem' }}
        className="tw-w-full tw-bg-white tw-rounded"
        onChange={(value: string) => {
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

      <label>Select issue type: *</label>
      <Select
        value={selectedIssueType}
        size="large"
        placeholder="Please select an option"
        style={{ marginBottom: '1rem' }}
        className="tw-w-full tw-bg-white tw-rounded"
        onChange={(value) => {
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
        placeholder="Title/Summary *"
        className="tw-mb-2 tw-w-full"
        inputClass="tw-bg-transparent tw-border-mid-grey tw-placeholder-black"
        onChange={(e) => setSelectedTitle(e.value)}
      />

      <AppTextArea
        value={description}
        canResize={false}
        placeholder="Card description"
        className="tw-mt-6 tw-w-full"
        inputClass="scroll-div tw-outline-none tw-bg-transparent tw-border-mid-grey tw-placeholder-black"
        onChange={(e) => setSelectedDescription(e.value)}
      />

      <AppSpinner show={projectLoading} local={true} />
    </Modal>
  );
};

export default CreateJiraTicketModal;
