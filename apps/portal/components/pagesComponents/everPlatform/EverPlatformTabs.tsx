import { useEffect, useState } from 'react';
import { Select, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import { getHealth, getStatus } from 'app/services/ever-platform';
import { getConnectHealth, getConnectStatus, isEverConnectBuildEnabled } from 'app/services/ever-connect';
import { getUserWorkspacesAPI } from 'app/services/api/workspace';
import EverPlatformStatistics from './EverPlatformStatistics';
import EverConnectAudit from './connect/EverConnectAudit';
import EverConnectConnection, { AdminWorkspace } from './connect/EverConnectConnection';
import EverConnectIntegrations from './connect/EverConnectIntegrations';
import EverConnectManaged from './connect/EverConnectManaged';
import EverConnectOrganizationLink from './connect/EverConnectOrganizationLink';
import { MUTED_TEXT, SELECT } from './connect/shared';

interface Availability {
  statistics: boolean;
  connect: boolean;
  operator: boolean;
}

const ok = (work: () => Promise<unknown>) =>
  work()
    .then(() => true)
    .catch(() => false);

/**
 * *Settings → Ever Platform*: the *Statistics* tab (the operator, when the API has the anonymous
 * usage statistics loaded) and, when this portal was built with `NEXT_PUBLIC_EVER_CONNECT_ENABLED=true`
 * and the API has the connection loaded, the Connect tabs: *Connection* (the operator only),
 * *Organization link*, *Integrations & data* and *Audit* (per workspace the person administers).
 */
const EverPlatformTabs: React.FC<{ uid: string | undefined }> = ({ uid }) => {
  const { t } = useTranslation();
  const [available, setAvailable] = useState<Availability | null>(null);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void (async () => {
      const statistics = await ok(() => getHealth().then(() => getStatus()));
      const connect = isEverConnectBuildEnabled() && (await ok(() => getConnectHealth()));
      const operator = connect && (await ok(() => getConnectStatus()));
      if (active) setAvailable({ statistics, connect, operator });
      if (connect && uid) {
        try {
          const answer: any = await getUserWorkspacesAPI();
          const own = ((answer?.data ?? []) as Array<{ id: string; name: string; admin: string }>)
            .filter((workspace) => workspace?.admin === uid)
            .map((workspace) => ({ id: workspace.id, name: workspace.name }));
          if (active) {
            setWorkspaces(own);
            setWorkspaceId(own[0]?.id);
          }
        } catch {
          if (active) setWorkspaces([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  if (!available) return <p data-testid="ever-platform-loading" className={MUTED_TEXT}>{t('page.everPlatform.loading')}</p>;
  if (!available.statistics && !available.connect) {
    return <p data-testid="ever-platform-unavailable" className={MUTED_TEXT}>{t('page.everPlatform.unavailable')}</p>;
  }

  const picker =
    workspaces.length > 1 ? (
      <Select
        data-testid="ever-connect-workspace-picker"
        className={`tw-mb-6 tw-min-w-[240px] ${SELECT}`}
        value={workspaceId}
        onChange={(value: string) => setWorkspaceId(value)}
        options={workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name }))}
      />
    ) : null;
  const perWorkspace = (render: (id: string) => React.ReactNode) =>
    workspaceId ? (
      <>
        {picker}
        {render(workspaceId)}
      </>
    ) : (
      <p data-testid="ever-connect-no-workspace" className={MUTED_TEXT}>{t('page.everPlatform.connect.noWorkspace')}</p>
    );

  const items = [
    ...(available.statistics
      ? [{ key: 'statistics', label: t('page.everPlatform.tabs.statistics'), children: <EverPlatformStatistics /> }]
      : []),
    ...(available.connect && available.operator
      ? [{ key: 'connection', label: t('page.everPlatform.tabs.connection'), children: <EverConnectConnection workspaces={workspaces} /> }]
      : []),
    ...(available.connect
      ? [
          {
            key: 'link',
            label: t('page.everPlatform.tabs.link'),
            children: perWorkspace((id) => <EverConnectOrganizationLink key={id} workspaceId={id} />),
          },
          {
            key: 'integrations',
            label: t('page.everPlatform.tabs.integrations'),
            children: available.operator ? (
              <EverConnectIntegrations operator />
            ) : (
              perWorkspace((id) => <EverConnectIntegrations key={id} operator={false} workspaceId={id} />)
            ),
          },
          ...(available.operator
            ? [
                {
                  key: 'managed',
                  label: t('page.everPlatform.tabs.managed'),
                  children: <EverConnectManaged />,
                },
              ]
            : []),
          {
            key: 'audit',
            label: t('page.everPlatform.tabs.audit'),
            children: available.operator ? (
              <EverConnectAudit operator />
            ) : (
              perWorkspace((id) => <EverConnectAudit key={id} operator={false} workspaceId={id} />)
            ),
          },
        ]
      : []),
  ];

  return (
    <div
      data-testid="ever-platform-tabs"
      // Underline tabs: a gap between the labels, the panel flush with the page title.
      className="[&_.ant-tabs-nav-list]:tw-gap-6 [&_.ant-tabs_.ant-tabs-content-holder]:tw-m-0 [&_.ant-tabs_.ant-tabs-nav]:tw-mb-6"
    >
      <Tabs items={items} destroyInactiveTabPane />
    </div>
  );
};

export default EverPlatformTabs;
