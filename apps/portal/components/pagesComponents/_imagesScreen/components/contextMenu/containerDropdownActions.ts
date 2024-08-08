import { IDropdownAvailableActions } from './ItemDropdownActions';

export const defaultAvailableActions: IDropdownAvailableActions = {
  hasMove: true,
  hasMoveToWorkspace: true,
  hasSlackShareAction: true,
  hasJiraShareAction: true,
  hasTrelloShareAction: true,
  hasWhatAppShareAction: true,
};

export const combinedContainerDropdownActions: IDropdownAvailableActions = {
  hasMove: false,
  hasMoveToWorkspace: false, // TODO: implement
  hasSlackShareAction: true,
  hasJiraShareAction: true,
  hasTrelloShareAction: true,
  hasWhatAppShareAction: true,
};

export const combinedContainerDropdownActionsForTrash: IDropdownAvailableActions = {
  hasMove: false,
  hasMoveToWorkspace: false, // TODO: implement
  hasSlackShareAction: false,
  hasJiraShareAction: false,
  hasTrelloShareAction: false,
  hasWhatAppShareAction: false,
};

export const workspaceDropdownActions: IDropdownAvailableActions = {
  hasMove: true,
  hasMoveToWorkspace: false,
  hasSlackShareAction: false,
  hasJiraShareAction: false,
  hasTrelloShareAction: false,
  hasWhatAppShareAction: false,
};
