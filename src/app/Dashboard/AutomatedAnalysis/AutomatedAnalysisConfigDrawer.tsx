/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { LoadingView } from '@app/LoadingView/LoadingView';
import { RecordingAttributes } from '@app/Shared/Services/Api.service';
import { RECORDING_FAILURE_MESSAGE, TEMPLATE_UNSUPPORTED_MESSAGE } from '@app/Shared/Services/Report.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { automatedAnalysisConfigToRecordingAttributes } from '@app/Shared/Services/Settings.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
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
        })
      );
    },
    [addSubscription, context.api, setIsLoading, onCreate, onError]
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
