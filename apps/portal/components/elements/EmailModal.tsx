import React, { useEffect, useState } from 'react';
import { Checkbox, Modal } from 'antd';
import IEditorImage from 'app/interfaces/IEditorImage';
import AppButton from 'components/controls/AppButton';
import IEditorVideo, { DbVideoData } from 'app/interfaces/IEditorVideo';
import { ReactMultiEmail } from 'react-multi-email';
import { sendItem } from 'app/services/imageandvideo';
import { ItemType } from 'app/interfaces/ItemType';
import TextArea from 'antd/lib/input/TextArea';
import {
  loadingMessage,
  warnMessage,
  errorMessage,
  infoMessage,
} from 'app/services/helpers/toastMessages';
import { getShareLink } from 'app/services/screenshots';
import {
  createVideoTemplate,
  getShareLinkVideo,
  getTemplateRefName,
  setTemplateRefName,
} from 'app/services/videos';
import { errorHandler } from 'app/services/helpers/errors';
import AppSvg from 'components/elements/AppSvg';
import { saveSegmentEvent } from 'app/services/general';
import { RootStateOrAny, useSelector, useDispatch } from 'react-redux';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
interface IEmailModalProps {
  visible: boolean;
  onCancel: () => void;
  item: IEditorImage | IEditorVideo | null;
  itemType: ItemType;
  itemPublicLink: string;
  onSave?: () => void;
  fromEditor?: boolean;
}
const EmailModal: React.FC<IEmailModalProps> = ({
  onCancel,
  visible,
  item,
  itemType,
  itemPublicLink,
  onSave,
  fromEditor,
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [messagestatus, setMesagestatus] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [emailcollection, setEmailcollection] = useState<{
    emails: string[] /*  */;
  }>();
  const { emailImageLink } = useSelector(
    (state: RootStateOrAny) => state.panel.emailImageState,
  );

  const onOkHandler = async () => {
    if (
      emailcollection?.emails &&
      emailcollection?.emails.length > 0 &&
      item &&
      item.dbData?.id
    ) {
      onCancel();

      try {
        const id = undefined;
        let templateUrl: string | false = false;
        const itemLink =
          itemType == 'image'
            ? await getShareLink(item.dbData?.id)
            : await getShareLinkVideo(item.dbData?.id);

        const itemData = item.dbData as DbVideoData;
        const streamData = itemData?.streamData;

        if (streamData) {
          templateUrl = streamData.thumbnailUrl;
        } else {
          const templateRefName: string | false =
            itemType == 'video' && (await getTemplateRefName(item.dbData?.id));

          if (!templateRefName && itemType == 'video') {
            const template: Blob | null = await createVideoTemplate(
              item.url as string,
            );

            if (template) {
              templateUrl = await setTemplateRefName(template, item.dbData.id);
            }
          } else {
            templateUrl = templateRefName;
          }
        }

        if (messagestatus) {
          sendItem(
            emailcollection?.emails,
            itemLink,
            itemType,
            itemPublicLink,
            id as any,
            templateUrl,
            message,
          );
          setMessage('');
          setMesagestatus(false);
          await saveSegmentEvent(itemType + ' send by email', {
            title: item.dbData?.title,
          });
        } else {
          sendItem(
            emailcollection?.emails,
            itemLink,
            itemType,
            itemPublicLink,
            id as any,
            templateUrl,
          );
          await saveSegmentEvent(itemType + ' send by email', {
            title: item.dbData?.title,
          });
        }
        infoMessage(t('toasts.emailSent'));
        setEmailcollection({ emails: [] });
      } catch (err) {
        errorHandler(err);
      }
    } else {
      warnMessage(t('toasts.emailFieldEmpty'));
    }
  };

  const saveAndSend = async () => {
    if (emailcollection?.emails && emailcollection.emails.length > 0) {
      onCancel();
      try {
        dispatch(
          PanelAC.setEmailImage({
            emailImage: true,
            emailImageLink: null,
            itemPublicLink: null,
          }),
        );
        await onSave?.();
      } catch (error: any) {
        errorHandler(error);
        dispatch(
          PanelAC.setEmailImage({
            emailImage: false,
            emailImageLink: null,
            itemPublicLink: null,
          }),
        );
      }
    } else errorMessage(t('toasts.emailFieldEmpty'));
  };

  useEffect(() => {
    if (emailImageLink && emailcollection) {
      const id = undefined;
      if (messagestatus) {
        setMessage('');
        setMesagestatus(false);
      }
      sendItem(
        emailcollection?.emails,
        emailImageLink,
        'image',
        itemPublicLink,
        id as any,
        false,
        message,
      );
      setEmailcollection({ emails: [] });
    }
  }, [emailImageLink]);

  return (
    <Modal
      open={visible}
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
            disabled={
              !emailcollection?.emails || emailcollection?.emails?.length === 0
            }
            onClick={fromEditor ? saveAndSend : onOkHandler}
            className="tw-flex tw-h-9 tw-items-center tw-justify-center tw-px-4 tw-py-0"
          >
            {t('common.sendEmail')}
          </AppButton>
        </div>
      }
    >
      <h2 className="tw-text-base tw-font-semibold tw-mb-4 tw-pe-6">
        {t('extras.sendItemTo', { itemType: itemType })}
      </h2>

      {/* The library ships its own white field; the classes put it on the Ever input. */}
      <ReactMultiEmail
        emails={emailcollection?.emails}
        placeholder={t('workspace.addEmail')}
        className="tw-w-full tw-min-h-10 !tw-rounded-md !tw-border !tw-border-solid !tw-border-input !tw-bg-transparent !tw-px-2 !tw-py-1 !tw-text-sm !tw-text-foreground tw-transition-[border-color,box-shadow] tw-duration-150 [&.focused]:!tw-border-ring [&.focused]:tw-ring-2 [&.focused]:tw-ring-ring/20 [&>input]:!tw-bg-transparent [&>input]:tw-text-foreground [&>span[data-placeholder]]:!tw-text-muted-foreground"
        onChange={(_emails: string[]) => {
          setEmailcollection({ emails: _emails });
        }}
        getLabel={(
          email: string,
          index: number,
          removeEmail: (index: number) => void,
        ) => {
          return (
            <div
              data-tag
              className="!tw-rounded-md !tw-bg-muted !tw-px-2 !tw-py-1 !tw-text-xs !tw-font-medium !tw-text-foreground"
              key={index}
            >
              {email}

              <div
                className="tw-cursor-pointer tw-ms-1 tw-text-muted-foreground hover:tw-text-foreground"
                onClick={() => removeEmail(index)}
              >
                <AppSvg
                  path="/common/close.svg"
                  size="14px"
                  className="[&_path]:tw-fill-current"
                />
              </div>
            </div>
          );
        }}
      />

      <div
        className={`tw-pt-3 tw-flex tw-w-full tw-items-start tw-justify-between  tw-flex-${
          messagestatus ? 'col' : 'row'
        } `}
      >
        <Checkbox
          checked={messagestatus}
          onChange={() => setMesagestatus(!messagestatus)}
        >
          <span className="tw-text-foreground">{t('common.addMessage')}</span>
        </Checkbox>
        {messagestatus ? (
          <TextArea
            className="tw-w-full"
            style={{
              margin: '8px 0px',
            }}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            defaultValue={message}
            placeholder={t('common.typeMessage')}
            autoSize={{ minRows: 3, maxRows: 5 }}
          />
        ) : (
          <></>
        )}
        <div
          className={`tw-flex tw-w-${
            messagestatus ? 'full' : ''
          } tw-items-center tw-justify-end`}
        ></div>
      </div>
    </Modal>
  );
};
export default EmailModal;
