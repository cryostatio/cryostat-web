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
import { EventTemplate, TemplateType } from '@app/CreateRecording/CreateRecording';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
import {
  automatedAnalysisConfigToRecordingAttributes,
  RecordingAttributes,
  RecordingOptions
} from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { AutomatedAnalysisRecordingConfig } from '@app/Shared/Services/Settings.service';
import { SelectTemplateSelectorForm } from '@app/TemplateSelector/SelectTemplateSelectorForm';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  ActionGroup,
  Button, Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelContent,
  Dropdown, DropdownItem, DropdownToggle,
  DropdownToggleAction,
  Form,
  FormGroup,
  FormSection,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Level,
  LevelItem, Split,
  SplitItem, Text, TextInput, TextVariants, ValidatedOptions
} from '@patternfly/react-core';
import { CogIcon, PlusCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { concatMap, first } from 'rxjs';
import { automatedAnalysisRecordingName } from './AutomatedAnalysisCard';

interface AutomatedAnalysisConfigDrawerProps {
  drawerContent: React.ReactNode;
  onCreate: () => void;
}

export const AutomatedAnalysisConfigDrawer: React.FunctionComponent<AutomatedAnalysisConfigDrawerProps> =
  (props) => {
    const context = React.useContext(ServiceContext);
    const addSubscription = useSubscriptions();

    const [templates, setTemplates] = React.useState([] as EventTemplate[]);
    const [templateName, setTemplateName] = React.useState<string | undefined>(undefined);
    const [templateType, setTemplateType] = React.useState<TemplateType | undefined>(undefined);
    const [maxAge, setMaxAge] = React.useState(0);
    const [maxAgeUnits, setMaxAgeUnits] = React.useState(1);
    const [maxSize, setMaxSize] = React.useState(0);
    const [maxSizeUnits, setMaxSizeUnits] = React.useState(1);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [showHelperMessage, setShowHelperMessage] = React.useState(false);
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
        setIsLoading(true);
        addSubscription(
          context.api
            .createRecording(recordingAttributes)
            .pipe(first())
            .subscribe({
              next: (resp) => {
                setIsLoading(false);
                props.onCreate();
              },
              error: (err) => {
                setIsLoading(false);
              },
            })
        );
      },
      [addSubscription, context.api, setIsLoading, props.onCreate]
    );

    const onDefaultRecordingStart = React.useCallback(() => {
      const config = context.settings.automatedAnalysisRecordingConfig();
      const attributes = automatedAnalysisConfigToRecordingAttributes(config);
      handleCreateRecording(attributes);
    }, [context.settings, context.settings.automatedAnalysisRecordingConfig, handleCreateRecording]);

    const createButtonLoadingProps = React.useMemo(
      () =>
        ({
          spinnerAriaValueText: 'Creating',
          spinnerAriaLabel: 'create-active-recording',
          isLoading: isLoading,
        } as LoadingPropsType),
      [isLoading]
    );

    const isFormInvalid: boolean = React.useMemo(() => {
      return !templateName || !templateType;
    }, [templateName, templateType]);

    React.useEffect(() => {
      addSubscription(
        context.target
          .target()
          .pipe(
            first(),
            concatMap((target) =>
              context.api.doGet<EventTemplate[]>(`targets/${encodeURIComponent(target.connectUrl)}/templates`)
            )
          )
          .subscribe(setTemplates)
      );
    }, [addSubscription, context.target, context.api, setTemplates]);

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

    const handleMaxAgeChange = React.useCallback(
      (evt) => {
        setMaxAge(Number(evt));
      },
      [setMaxAge]
    );

    const handleMaxAgeUnitChange = React.useCallback(
      (evt) => {
        setMaxAgeUnits(Number(evt));
      },
      [setMaxAgeUnits]
    );

    const handleMaxSizeChange = React.useCallback(
      (evt) => {
        setMaxSize(Number(evt));
      },
      [setMaxSize]
    );

    const handleMaxSizeUnitChange = React.useCallback(
      (evt) => {
        setMaxSizeUnits(Number(evt));
      },
      [setMaxSizeUnits]
    );

    const handleTemplateChange = React.useCallback(
      (templateName?: string, templateType?: TemplateType) => {
        setTemplateName(templateName);
        setTemplateType(templateType);
      },
      [setTemplateName, setTemplateType]
    );

    const getEventString = React.useCallback(() => {
      var str = '';
      if (!!templateName) {
        str += `template=${templateName}`;
      }
      if (!!templateType) {
        str += `,type=${templateType}`;
      }
      return str;
    }, [templateName, templateType]);

    const handleSubmit = React.useCallback(() => {
      const options: RecordingOptions = {
        toDisk: true,
        maxAge: maxAge * maxAgeUnits,
        maxSize: maxSize * maxSizeUnits,
      };
      const recordingAttributes: RecordingAttributes = {
        name: automatedAnalysisRecordingName,
        events: getEventString(),
        duration: undefined,
        archiveOnStop: false,
        options: options,
        metadata: {
          labels: {
            origin: automatedAnalysisRecordingName,
          },
        },
      };
      handleCreateRecording(recordingAttributes);
    }, [getEventString, maxAge, maxAgeUnits, maxSize, maxSizeUnits, handleCreateRecording]);

    const handleSaveConfig = React.useCallback(() => {
      const options: AutomatedAnalysisRecordingConfig = {
        templates: getEventString(),
        maxAge: maxAge * maxAgeUnits,
        maxSize: maxSize * maxSizeUnits,
      };
      context.settings.setAutomatedAnalysisRecordingConfig(options);
      setShowHelperMessage(true);
    }, [getEventString, setShowHelperMessage, maxAge, maxAgeUnits, maxSize, maxSizeUnits, context.settings, context.settings.setAutomatedAnalysisRecordingConfig]);

    const panelContent = React.useMemo(() => {
      return (
        <DrawerPanelContent>
          <DrawerHead>
            <span tabIndex={isExpanded ? 0 : -1} ref={drawerRef}>
              <Form>
                <FormSection title="Profiling Recording Configuration">
                  <FormGroup
                    label="Template"
                    isRequired
                    fieldId="recording-template"
                    validated={!templateName ? ValidatedOptions.default : ValidatedOptions.success}
                    helperText={'The Event Template to be applied in this recording'}
                    helperTextInvalid="A Template must be selected"
                  >
                    <SelectTemplateSelectorForm
                      templates={templates}
                      validated={!templateName ? ValidatedOptions.default : ValidatedOptions.success}
                      disabled={isLoading}
                      onSelect={handleTemplateChange}
                    />
                  </FormGroup>
                  <FormGroup
                    label="Maximum size"
                    fieldId="maxSize"
                    helperText="The maximum size of recording data saved to disk"
                  >
                    <Split hasGutter={true}>
                      <SplitItem isFilled>
                        <TextInput
                          value={maxSize}
                          isRequired
                          type="number"
                          id="maxSize"
                          aria-label="max size value"
                          onChange={handleMaxSizeChange}
                          min="0"
                        />
                      </SplitItem>
                      <SplitItem>
                        <FormSelect
                          value={maxSizeUnits}
                          onChange={handleMaxSizeUnitChange}
                          aria-label="Max size units input"
                        >
                          <FormSelectOption key="1" value="1" label="B" />
                          <FormSelectOption key="2" value={1024} label="KiB" />
                          <FormSelectOption key="3" value={1024 * 1024} label="MiB" />
                        </FormSelect>
                      </SplitItem>
                    </Split>
                  </FormGroup>
                  <FormGroup
                    label="Maximum age"
                    fieldId="maxAge"
                    helperText="The maximum age of recording data stored to disk"
                  >
                    <Split hasGutter={true}>
                      <SplitItem isFilled>
                        <TextInput
                          value={maxAge}
                          isRequired
                          type="number"
                          id="maxAgeDuration"
                          aria-label="Max age duration"
                          onChange={handleMaxAgeChange}
                          min="0"
                        />
                      </SplitItem>
                      <SplitItem>
                        <FormSelect
                          value={maxAgeUnits}
                          onChange={handleMaxAgeUnitChange}
                          aria-label="Max Age units Input"
                        >
                          <FormSelectOption key="1" value="1" label="Seconds" />
                          <FormSelectOption key="2" value={60} label="Minutes" />
                          <FormSelectOption key="3" value={60 * 60} label="Hours" />
                        </FormSelect>
                      </SplitItem>
                    </Split>
                  </FormGroup>
                  <ActionGroup>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      isDisabled={isFormInvalid || isLoading}
                      {...createButtonLoadingProps}
                    >
                      {isLoading ? 'Creating' : 'Create'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleSaveConfig}
                      isDisabled={isFormInvalid || isLoading}
                    >
                      Save configuration
                    </Button>
                    {
                      showHelperMessage && (
                        <HelperText>
                          <HelperTextItem variant="success">
                            <Text component={TextVariants.p}>Automated analysis recording configuration saved. You can also change this in the&nbsp;
                              <Button isInline component="a" href="settings" variant='link' icon={<CogIcon />}>
                                Settings&nbsp;
                              </Button>
                              view.
                            </Text> 
                          </HelperTextItem>
                        </HelperText>
                      )
                    }
                  </ActionGroup>
                </FormSection>
              </Form>
            </span>
            <DrawerActions>
              <DrawerCloseButton onClick={onCloseClick} />
            </DrawerActions>
          </DrawerHead>
        </DrawerPanelContent>
      );
    }, [
      onCloseClick,
      handleSubmit,
      handleMaxSizeChange,
      handleMaxSizeUnitChange,
      handleMaxAgeChange,
      handleMaxAgeUnitChange,
      handleTemplateChange,
      isExpanded,
      isFormInvalid,
      maxSize,
      maxSizeUnits,
      maxAge,
      maxAgeUnits,
      templates,
      templateName,
      showHelperMessage,
      isLoading,
    ]);

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
