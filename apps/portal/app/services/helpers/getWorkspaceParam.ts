export const getWorkspaceParam = (isWorkspace: boolean) => {
  return isWorkspace ? '?isWorkspace=true' : '';
};
