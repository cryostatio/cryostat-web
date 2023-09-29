/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LoadingView } from '@app/Shared/Components/LoadingView';
import {
  RecordingAttributes,
  TEMPLATE_UNSUPPORTED_MESSAGE,
  RECORDING_FAILURE_MESSAGE,
} from '@app/Shared/Services/api.types';
import { automatedAnalysisConfigToRecordingAttributes } from '@app/Shared/Services/service.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  Button,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  InputGroup,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AutomatedAnalysisConfigForm } from './AutomatedAnalysisConfigForm';

interface AutomatedAnalysisConfigDrawerProps {
  drawerContent: React.ReactNode;
  isContentAbove: boolean;
  onCreate: () => void;
  onError: (error: Error) => void;
}

export const AutomatedAnalysisConfigDrawer: React.FC<AutomatedAnalysisConfigDrawerProps> = ({
  onCreate,
  onError,
  ...props
}) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const { t } = useTranslation();

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const drawerRef = React.useRef<HTMLDivElement>(null);

  const handleCreateRecording = React.useCallback(
    (recordingAttributes: RecordingAttributes) => {
      setIsLoading(true);
      addSubscription(
        context.api.createRecording(recordingAttributes).subscribe({
          next: (resp) => {
            setIsLoading(false);
            if (resp && resp.ok) {
              onCreate();
            } else if (resp?.status === 500) {
              onError(new Error(TEMPLATE_UNSUPPORTED_MESSAGE));
            } else {
              onError(new Error(RECORDING_FAILURE_MESSAGE));
            }
          },
          error: (err) => {
            setIsLoading(false);
            onError(err);
          },
        }),
      );
    },
    [addSubscription, context.api, setIsLoading, onCreate, onError],
  );

  const onDefaultRecordingStart = React.useCallback(() => {
    const config = context.settings.automatedAnalysisRecordingConfig();
    const attributes = automatedAnalysisConfigToRecordingAttributes(config);
    handleCreateRecording(attributes);
  }, [context.settings, handleCreateRecording]);

  const onExpand = React.useCallback(() => {
    drawerRef.current && drawerRef.current.focus();
  }, [drawerRef]);

  const onCogSelect = React.useCallback(() => {
    setIsExpanded((old) => !old);
  }, [setIsExpanded]);

  const onDrawerClose = React.useCallback(() => {
    setIsExpanded(false);
  }, [setIsExpanded]);

  const panelContent = React.useMemo(() => {
    return (
      <DrawerPanelContent isResizable style={{ zIndex: 199 }}>
        <DrawerHead>
          <span tabIndex={isExpanded ? 0 : -1} ref={drawerRef}></span>
          <DrawerActions>
            <DrawerCloseButton onClick={onDrawerClose} />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>
          <AutomatedAnalysisConfigForm useTitle />
        </DrawerPanelBody>
      </DrawerPanelContent>
    );
  }, [isExpanded, onDrawerClose]);

  const inputGroup = React.useMemo(() => {
    return (
      <InputGroup>
        <div style={{ margin: 'auto' }}>
          <Button
            aria-label={t('AutomatedAnalysisConfigDrawer.INPUT_GROUP.OPEN_SETTINGS.LABEL')}
            variant="control"
            onClick={onCogSelect}
            icon={<CogIcon />}
          />
          <Button
            id={'automated-analysis-config-drawer-create-recording-button'}
            aria-label={t('AutomatedAnalysisConfigDrawer.INPUT_GROUP.CREATE_RECORDING.LABEL')}
            variant="control"
            onClick={onDefaultRecordingStart}
          >
            <span style={{ marginRight: '0.2em' }}>
              {t('AutomatedAnalysisConfigDrawer.INPUT_GROUP.CREATE_RECORDING.LABEL')}
            </span>
          </Button>
        </div>
      </InputGroup>
    );
  }, [t, onCogSelect, onDefaultRecordingStart]);

  const drawerContentBody = React.useMemo(() => {
    return (
      <DrawerContentBody>
        <Stack hasGutter>
          <StackItem>{props.isContentAbove ? props.drawerContent : inputGroup}</StackItem>
          <StackItem>{props.isContentAbove ? inputGroup : props.drawerContent}</StackItem>
        </Stack>
      </DrawerContentBody>
    );
  }, [props.drawerContent, props.isContentAbove, inputGroup]);

  const view = React.useMemo(() => {
    if (isLoading) {
      return <LoadingView />;
    }
    return (
      <Drawer isExpanded={isExpanded} position="right" onExpand={onExpand} isInline>
        <DrawerContent panelContent={panelContent}>{drawerContentBody}</DrawerContent>
      </Drawer>
    );
  }, [isExpanded, onExpand, panelContent, drawerContentBody, isLoading]);

  return view;
};
