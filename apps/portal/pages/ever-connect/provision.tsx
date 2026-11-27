import ProvisionConfirm from 'components/pagesComponents/everConnect/ProvisionConfirm';

/**
 * `/ever-connect/provision#intent=…`: where app.ever.co sends a person who starts an Ever Rec cloud
 * workspace. Reachable signed out (the person signs in with Ever ID from here).
 */
const EverConnectProvisionPage: React.FC = () => (
  <div className="tw-flex tw-min-h-screen tw-items-center tw-justify-center tw-bg-background tw-p-4">
    <ProvisionConfirm />
  </div>
);

export default EverConnectProvisionPage;
