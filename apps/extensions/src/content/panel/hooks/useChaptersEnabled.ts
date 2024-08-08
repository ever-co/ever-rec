import { useState, useEffect } from 'react';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { IWorkspaceVideo } from '@/app/interfaces/IWorkspace';
import { enableChapters } from '@/app/services/videosChapters';
import { successMessage } from '@/app/services/helpers/toastMessages';
import {
  createMarkersEvent,
  removeMarkersEvent,
} from '@/content/utilities/misc/customEvents';

const useChaptersEnabled = (
  video: IEditorVideo | IWorkspaceVideo | null,
  workspaceId = '',
) => {
  const [chaptersEnabled, setChaptersEnabled] = useState(true);

  useEffect(() => {
    if (!video) return;

    const chaptersEnabled = video?.dbData?.chaptersEnabled;

    if (typeof chaptersEnabled !== 'undefined') {
      setChaptersEnabled(chaptersEnabled);
    }
  }, [video]);

  const updateChaptersEnabled = async () => {
    if (!video?.dbData?.id) return;

    const newSetting = !chaptersEnabled;

    await enableChapters(video.dbData.id, newSetting, workspaceId);

    if (newSetting) {
      createMarkersEvent([]);
    } else {
      removeMarkersEvent();
    }

    setChaptersEnabled(newSetting);
    successMessage('Chapters visibility changed successfully.');
  };

  return { chaptersEnabled, updateChaptersEnabled };
};

export default useChaptersEnabled;
