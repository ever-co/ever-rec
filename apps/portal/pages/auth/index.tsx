import React, { useEffect, useState } from 'react';
import AppHeader from 'components/elements/AppHeader';
import LogoWrapper from 'components/elements/LogoWrapper';
import { useRouter } from 'next/router';
import { panelRoutes, preRoutes } from '../../components/_routes';
import Layout from 'antd/lib/layout/layout';
import GoogleBtn from 'components/pagesComponents/_signScreen/GoogleBtn';
import AppLink from 'components/controls/AppLink';
import LinksDivider from 'components/pagesComponents/_signScreen/LinksDivider';
import Image from 'next/legacy/image';
import { CredentialResponse } from '@react-oauth/google';
import { googleAuthorization } from '../../app/services/auth';
import FeaturesSection from 'components/pagesComponents/_signScreen/FeaturesSection';
import { useFeatures } from 'components/pagesComponents/_signScreen/FeatCard';
import {
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import redirect from 'misc/redirect';
import { useTranslation } from 'react-i18next';
import { languagesList } from 'components/shared/SCHeader/SCHeader';
import AppSvg from 'components/elements/AppSvg';
import { Dropdown } from 'antd';

type SignFlowName = 'login' | 'register' | 'resetPassword' | 'newResetPassword';

interface SignFlowComponent {
  children: React.ReactNode;
  componentType: SignFlowName;
}

interface FlowLink {
  name: SignFlowName;
  title: string;
  route: string;
}

const Auth: React.FC<SignFlowComponent> = ({ children, componentType }) => {
  const router = useRouter();
  const [params, setParams] = useState('');
  const { features, newFeatures } = useFeatures();
  const currentPathname = router.pathname.match(panelRoutes.login);
  const { t, i18n } = useTranslation();
  const flowLinks: FlowLink[] = [
    {
      name: 'login',
      title:
        t('page.auth.common.existingAccount') +
        ' ' +
        t('page.auth.common.login'),
      route: panelRoutes.login,
    },
    {
      name: 'register',
      title: t('page.auth.login.createAccount'),
      route: panelRoutes.register,
    },
    {
      name: 'resetPassword',
      title: t('page.auth.login.forgotPasswordLink'),
      route: panelRoutes.reset,
    },
  ];

  useEffect(() => {
    if (!router.isReady) return;

    const params: string[] = [];
    for (const [key, value] of Object.entries(router.query)) {
      params.push(`${key}=${value}`);
    }

    const joinedParams = params.length ? '?' + params.join('&') : '';

    setParams(joinedParams);
  }, [router.isReady, router.query]);

  const googleSubmit = async (credential: CredentialResponse) => {
    const id = loadingMessage();
    const result = await googleAuthorization(credential);
    updateMessage(id, result.message, result.status);

    if (result.status == 'success') {
      if (router.query && router.query.type == 'slack') {
        router.push(`/integration/slack`);
      } else {
        redirect(router);
      }
    }
  };
  const toggleLanguage = (code) => {
    i18n.changeLanguage(code);
  };

  const filteredLinks = (): FlowLink[] => {
    return flowLinks.filter((link) => link.name !== componentType);
  };
  const languagesMenu = languagesList((code) => toggleLanguage(code));

  return (
    <div className="mx-lg:tw-grid-cols-1 tw-inline-grid tw-grid-cols-2 tw-p-4 tw-min-h-screen tw-w-screen">
      <div className="tw-absolute tw-top-5 tw-left-5 ">
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          overlay={languagesMenu}
        >
          <div className=" tw-px-4 tw-py-2 tw-flex tw-cursor-pointer tw-border tw-rounded-md tw-border-[#5b4dbe]/20">
            <p>Language</p>
            <AppSvg path="/new-design-v2/down-caret.svg" size="20px" />
          </div>
        </Dropdown>
      </div>
      <div className="tw-flex tw-flex-col tw-items-center">
        <div className="tw-flex-1 tw-pt-16 tw-relative">
          <LogoWrapper />
          <div className="mx-sm:max-w-xs tw-w-full">
            <div className="tw-w-26rem">
              <AppHeader
                part1=""
                part2=""
                title={
                  componentType == 'resetPassword'
                    ? t('page.auth.resetPassword.title')
                    : currentPathname
                      ? t('page.auth.login.welcomeTitle')
                      : t('page.register.title')
                }
                className="tw-mb-6 tw-font-bold"
              />
              <p className="tw-mb-6 !tw-text-sm !tw-font-extralight">
                <b>
                  {currentPathname ? t('page.auth.login.welcomeTitle') : ''}
                </b>
              </p>
              <p className="tw-mb-16 !tw-text-sm !tw-font-extralight">
                <b>
                  {currentPathname
                    ? t('page.auth.login.welcomeDescription')
                    : ''}
                </b>
              </p>

              <Layout>
                <div className="">
                  {children}
                  {componentType != 'newResetPassword' && (
                    <>
                      {componentType != 'register' ? (
                        <div className="tw-text-center tw-my-7 tw-flex tw-justify-center"></div>
                      ) : (
                        ''
                      )}

                      <GoogleBtn onSuccess={googleSubmit} />

                      <div className="tw-flex tw-justify-center tw-mt-7">
                        {filteredLinks().map((link, index, arr) => (
                          <React.Fragment key={`link_${index}`}>
                            {componentType !== link.name && (
                              <AppLink
                                className="tw-text-primary-purple !tw-text-sm"
                                onClick={() =>
                                  router.push(
                                    `${preRoutes.auth}${link.route}${params}`,
                                  )
                                }
                              >
                                {link.title}
                              </AppLink>
                            )}
                            {index < arr.length - 1 && <LinksDivider />}
                          </React.Fragment>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </Layout>
            </div>
          </div>
        </div>
      </div>
      <div className="onboarding-section">
        <div className="tw-flex-1">
          {componentType == 'register' ? (
            <FeaturesSection features={features} />
          ) : componentType == 'login' ? (
            <FeaturesSection features={newFeatures} />
          ) : (
            <div className="tw-h-full tw-flex tw-justify-center">
              <Image
                src="/sign/signin1.svg"
                alt="Google"
                layout="intrinsic"
                height="650"
                width="500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
