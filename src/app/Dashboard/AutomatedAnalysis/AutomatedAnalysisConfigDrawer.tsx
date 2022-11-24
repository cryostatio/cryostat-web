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
import { automatedAnalysisConfigToRecordingAttributes, RecordingAttributes } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelContent,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  DropdownToggleAction,
  Level,
  LevelItem,
} from '@patternfly/react-core';
import { CogIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { first } from 'rxjs';
import { AutomatedAnalysisConfigForm } from './AutomatedAnalysisConfigForm';

interface AutomatedAnalysisConfigDrawerProps {
  drawerContent: React.ReactNode;
  onCreate: () => void;
}

export const AutomatedAnalysisConfigDrawer: React.FunctionComponent<AutomatedAnalysisConfigDrawerProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const drawerRef = React.useRef<HTMLDivElement>(null);

  const onToggle = React.useCallback(
    (selected) => {
      setIsDropdownOpen(selected);
    },
    [setIsDropdownOpen]
  );

  const onDropdownFocus = () => {
    const element = document.getElementById('automated-analysis-recording-config-dropdown');
    element?.focus();
  };

  const handleCreateRecording = React.useCallback(
    (recordingAttributes: RecordingAttributes) => {
      addSubscription(
        context.api
          .createRecording(recordingAttributes)
          .pipe(first())
          .subscribe({
            next: (resp) => {
              props.onCreate();
            },
            error: (err) => {},
          })
      );
    },
    [addSubscription, context.api, props.onCreate]
  );

  const onDefaultRecordingStart = React.useCallback(() => {
    const config = context.settings.automatedAnalysisRecordingConfig();
    const attributes = automatedAnalysisConfigToRecordingAttributes(config);
    handleCreateRecording(attributes);
  }, [context.settings, context.settings.automatedAnalysisRecordingConfig, handleCreateRecording]);

  const onDropdownSelect = React.useCallback(() => {
    setIsDropdownOpen(false);
    onDropdownFocus();
  }, [setIsDropdownOpen]);

  const onExpand = () => {
    drawerRef.current && drawerRef.current.focus();
  };

  const onClick = React.useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [setIsExpanded, isExpanded]);

  const onCloseClick = React.useCallback(() => {
    setIsExpanded(false);
  }, [setIsExpanded]);

  const panelContent = React.useMemo(() => {
    return (
      <DrawerPanelContent>
        <DrawerHead>
          <span tabIndex={isExpanded ? 0 : -1} ref={drawerRef}>
            <AutomatedAnalysisConfigForm onCreate={props.onCreate} isSettingsForm={false} />
          </span>
          <DrawerActions>
            <DrawerCloseButton onClick={onCloseClick} />
          </DrawerActions>
        </DrawerHead>
      </DrawerPanelContent>
    );
  }, [props.onCreate, onCloseClick]);

  const dropdownItems = [
    <DropdownItem key="custom" onClick={onClick} icon={<CogIcon />}>
      Custom
    </DropdownItem>,
    <DropdownItem key="default" onClick={onDefaultRecordingStart} icon={<PlusCircleIcon />}>
      Default
    </DropdownItem>,
  ];

  const dropdown = React.useMemo(() => {
    return (
      <Level>
        <LevelItem style={{ margin: 'auto' }}>
          <Dropdown
            isFlipEnabled
            menuAppendTo={'parent'}
            onSelect={onDropdownSelect}
            toggle={
              <DropdownToggle
                id="automated-analysis-recording-config-toggle"
                splitButtonItems={[
                  <DropdownToggleAction key="recording-cog-action" aria-label="Recording Actions" onClick={onClick}>
                    <CogIcon />
                  </DropdownToggleAction>,
                ]}
                onToggle={onToggle}
                splitButtonVariant="action"
                toggleVariant="default"
              >
                Create Recording &nbsp;&nbsp;
              </DropdownToggle>
            }
            isOpen={isDropdownOpen}
            dropdownItems={dropdownItems}
          />
        </LevelItem>
      </Level>
    );
  }, [isDropdownOpen, onToggle, onClick, onDropdownSelect]);

  return (
    <Drawer isExpanded={isExpanded} position="right" onExpand={onExpand} isInline>
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>
          {props.drawerContent}
          {dropdown}
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
