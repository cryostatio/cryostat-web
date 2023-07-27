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
import { AuthModal } from '@app/AppLayout/AuthModal';
import { EventTemplate } from '@app/CreateRecording/CreateRecording';
import { authFailMessage, ErrorView, isAuthFail } from '@app/ErrorView/ErrorView';
import { SelectTemplateSelectorForm } from '@app/Shared/SelectTemplateSelectorForm';
import {
  AutomatedAnalysisRecordingConfig,
  automatedAnalysisRecordingName,
  isHttpError,
  TemplateType,
} from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { TargetSelect } from '@app/Shared/TargetSelect';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Button,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormSection,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Text,
  TextInput,
  TextVariants,
  Title,
} from '@patternfly/react-core';
import { CloseIcon, PencilAltIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { first, iif, of, ReplaySubject, take } from 'rxjs';

interface AutomatedAnalysisConfigFormProps {
  useTitle?: boolean;
  inlineForm?: boolean;
}

interface FormConfig {
  maxAge: number;
  maxAgeUnits: number;
  maxSize: number;
  maxSizeUnits: number;
  template: Pick<Partial<EventTemplate>, 'name' | 'type'>;
}

export const AutomatedAnalysisConfigForm: React.FC<AutomatedAnalysisConfigFormProps> = ({
  useTitle = false,
  inlineForm = false,
}) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const { t } = useTranslation();

  const targetSubjectRef = React.useRef(new ReplaySubject<Target>(1));
  const targetSubject = targetSubjectRef.current;

  const [recordingConfig, setRecordingConfig] = React.useState<AutomatedAnalysisRecordingConfig>(
    context.settings.automatedAnalysisRecordingConfig()
  );
  const [formConfig, setFormConfig] = React.useState<FormConfig>({
    maxAge: context.settings.automatedAnalysisRecordingConfig().maxAge,
    maxAgeUnits: 1,
    maxSize: context.settings.automatedAnalysisRecordingConfig().maxSize,
    maxSizeUnits: 1,
    template: context.settings.automatedAnalysisRecordingConfig().template,
  });

  const [templates, setTemplates] = React.useState<EventTemplate[]>([]);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const refreshTemplates = React.useCallback(
    (target: Target) => {
      setIsLoading(true);
      addSubscription(
        iif(
          () => {
            return target === NO_TARGET;
          },
          of([]),
          context.api
            .doGet<EventTemplate[]>(
              `targets/${encodeURIComponent(target.connectUrl)}/templates`,
              'v1',
              undefined,
              undefined,
              true
            )
            .pipe(first())
        ).subscribe({
          next: (templates: EventTemplate[]) => {
            setErrorMessage('');
            setTemplates(templates);
            setFormConfig((old) => {
              const oldTemplate = old.template;
              const matched = templates.find((t) => t.name === oldTemplate.name && t.type === t.type);
              return {
                ...old,
                template: matched ? { name: matched.name, type: matched.type } : {},
              };
            });
            setIsLoading(false);
          },
          error: (err) => {
            setTemplates([]);
            setIsLoading(false);
            if (isHttpError(err) && err.httpResponse.status === 427) {
              setErrorMessage(authFailMessage);
              setIsAuthModalOpen(true);
            } else {
              setErrorMessage(err.message);
            }
          },
        })
      );
    },
    [addSubscription, context.api, setErrorMessage, setTemplates, setFormConfig, setIsLoading, setIsAuthModalOpen]
  );

  React.useEffect(() => {
    addSubscription(
      targetSubject.subscribe((target) => {
        refreshTemplates(target);
      })
    );
  }, [targetSubject, addSubscription, refreshTemplates, setIsLoading, editing]);

  const setAAConfig = React.useCallback(
    (config: AutomatedAnalysisRecordingConfig) => {
      if (!config.template) {
        return;
      }
      setRecordingConfig(config);
      context.settings.setAutomatedAnalysisRecordingConfig(config);
    },
    [context.settings, setRecordingConfig]
  );

  const handleMaxAgeChange = React.useCallback(
    (evt) => {
      setFormConfig((old) => {
        return {
          ...old,
          maxAge: Number(evt),
        };
      });
    },
    [setFormConfig]
  );

  const handleMaxAgeUnitChange = React.useCallback(
    (evt) => {
      setFormConfig((old) => {
        return {
          ...old,
          maxAgeUnits: Number(evt),
        };
      });
    },
    [setFormConfig]
  );

  const handleMaxSizeChange = React.useCallback(
    (evt) => {
      setFormConfig((old) => {
        return {
          ...old,
          maxSize: Number(evt),
        };
      });
    },
    [setFormConfig]
  );

  const handleMaxSizeUnitChange = React.useCallback(
    (evt) => {
      setFormConfig((old) => {
        return {
          ...old,
          maxSizeUnits: Number(evt),
        };
      });
    },
    [setFormConfig]
  );

  const handleTemplateChange = React.useCallback(
    (templateName?: string, templateType?: TemplateType) => {
      setFormConfig((old) => {
        return {
          ...old,
          template: {
            name: templateName,
            type: templateType,
          },
        };
      });
    },
    [setFormConfig]
  );

  const handleSubmit = React.useCallback(() => {
    const { template, maxSize, maxSizeUnits, maxAge, maxAgeUnits } = formConfig;
    setAAConfig({
      template: template as Pick<EventTemplate, 'name' | 'type'>,
      maxSize: maxSize * maxSizeUnits,
      maxAge: maxAge * maxAgeUnits,
    });
    setEditing(false);
  }, [setAAConfig, setEditing, formConfig]);

  const authRetry = React.useCallback(() => {
    setIsAuthModalOpen(true);
  }, [setIsAuthModalOpen]);

  const selectedSpecifier = React.useMemo(() => {
    const { name, type } = formConfig.template;
    if (name && type) {
      return `${name},${type}`;
    }
    return '';
  }, [formConfig.template]);

  const targetSelect = React.useMemo(() => {
    return editing && <TargetSelect simple onSelect={(target) => targetSubject.next(target)} />;
  }, [editing, targetSubject]);

  const configData = React.useMemo(() => {
    if (editing) {
      return (
        <Grid hasGutter lg={4} md={12}>
          <GridItem>
            <FormGroup
              label={t(`TEMPLATE`, { ns: 'common' })}
              isRequired
              fieldId="recording-template"
              helperText={
                <>
                  <HelperText className={`${automatedAnalysisRecordingName}-config-save-template-warning-helper`}>
                    <HelperTextItem>{t('AutomatedAnalysisConfigForm.TEMPLATE_HELPER_TEXT')}</HelperTextItem>
                    {formConfig.template.type == 'TARGET' && errorMessage === '' && (
                      <HelperTextItem variant="warning">
                        <Text component={TextVariants.p}>
                          {t('AutomatedAnalysisConfigForm.TEMPLATE_INVALID_WARNING')}
                        </Text>
                      </HelperTextItem>
                    )}
                  </HelperText>
                </>
              }
            >
              {isLoading ? (
                <Spinner size="md" />
              ) : errorMessage != '' ? (
                <ErrorView
                  title={t('ErrorView.EVENT_TEMPLATES')}
                  message={errorMessage}
                  retry={isAuthFail(errorMessage) ? authRetry : undefined}
                />
              ) : (
                <SelectTemplateSelectorForm
                  templates={templates}
                  onSelect={handleTemplateChange}
                  selected={selectedSpecifier}
                />
              )}
            </FormGroup>
          </GridItem>
          <GridItem>
            <FormGroup
              label={t('MAXIMUM_SIZE', { ns: 'common' })}
              fieldId="maxSize"
              helperText={t('MAXIMUM_SIZE_HELPER_TEXT', { ns: 'common' })}
            >
              <Split hasGutter={true}>
                <SplitItem isFilled>
                  <TextInput
                    value={formConfig.maxSize}
                    isRequired
                    type="number"
                    id="maxSize"
                    aria-label={t('AriaLabels.MAXIMUM_SIZE', { ns: 'common' })}
                    onChange={handleMaxSizeChange}
                    min="0"
                  />
                </SplitItem>
                <SplitItem>
                  <FormSelect
                    value={formConfig.maxSizeUnits}
                    onChange={handleMaxSizeUnitChange}
                    aria-label={t('AriaLabels.MAXIMUM_SIZE_UNITS_INPUT', { ns: 'common' })}
                  >
                    <FormSelectOption key="1" value="1" label="B" />
                    <FormSelectOption key="2" value={1024} label="KiB" />
                    <FormSelectOption key="3" value={1024 * 1024} label="MiB" />
                  </FormSelect>
                </SplitItem>
              </Split>
            </FormGroup>
          </GridItem>
          <GridItem>
            <FormGroup
              label={t('MAXIMUM_AGE', { ns: 'common' })}
              fieldId="maxAge"
              helperText={t('MAXIMUM_AGE_HELPER_TEXT', { ns: 'common' })}
            >
              <Split hasGutter={true}>
                <SplitItem isFilled>
                  <TextInput
                    value={formConfig.maxAge}
                    isRequired
                    type="number"
                    id="maxAgeDuration"
                    aria-label={t('AriaLabels.MAXIMUM_AGE', { ns: 'common' })}
                    onChange={handleMaxAgeChange}
                    min="0"
                  />
                </SplitItem>
                <SplitItem>
                  <FormSelect
                    value={formConfig.maxAgeUnits}
                    onChange={handleMaxAgeUnitChange}
                    aria-label={t('AriaLabels.MAXIMUM_AGE_UNITS_INPUT', { ns: 'common' })}
                  >
                    <FormSelectOption key="1" value="1" label={t('SECOND', { count: 0, ns: 'common' })} />
                    <FormSelectOption key="2" value={60} label={t('MINUTE', { count: 0, ns: 'common' })} />
                    <FormSelectOption key="3" value={60 * 60} label={t('HOUR', { count: 0, ns: 'common' })} />
                  </FormSelect>
                </SplitItem>
              </Split>
            </FormGroup>
          </GridItem>
        </Grid>
      );
    }
    return (
      <DescriptionList isCompact isAutoFit>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('TEMPLATE', { ns: 'common' })}</DescriptionListTerm>
          <DescriptionListDescription>
            {t('AutomatedAnalysisConfigForm.FORMATTED_TEMPLATE', { template: recordingConfig.template })}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('AutomatedAnalysisConfigForm.MAXIMUM_SIZE', { unit: 'B' })}</DescriptionListTerm>
          <DescriptionListDescription>{recordingConfig.maxSize}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('AutomatedAnalysisConfigForm.MAXIMUM_AGE', { unit: 's' })}</DescriptionListTerm>
          <DescriptionListDescription>{recordingConfig.maxAge}</DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    );
  }, [
    t,
    isLoading,
    editing,
    recordingConfig,
    formConfig,
    templates,
    selectedSpecifier,
    handleTemplateChange,
    handleMaxSizeChange,
    handleMaxSizeUnitChange,
    handleMaxAgeChange,
    handleMaxAgeUnitChange,
    errorMessage,
    authRetry,
  ]);

  const toggleEdit = React.useCallback(() => {
    setEditing((edit) => !edit);
    setFormConfig({
      template: recordingConfig.template,
      maxSize: recordingConfig.maxSize,
      maxAge: recordingConfig.maxAge,
      maxSizeUnits: 1,
      maxAgeUnits: 1,
    });
  }, [setEditing, setFormConfig, recordingConfig]);

  const authModal = React.useMemo(() => {
    return (
      <AuthModal
        visible={isAuthModalOpen}
        onDismiss={() => setIsAuthModalOpen(false)}
        onSave={() => {
          setIsAuthModalOpen(false);
          addSubscription(
            targetSubject.pipe(take(1)).subscribe((target) => {
              refreshTemplates(target);
            })
          );
        }}
        targetObs={targetSubject}
      />
    );
  }, [addSubscription, isAuthModalOpen, setIsAuthModalOpen, refreshTemplates, targetSubject]);

  const formContent = React.useMemo(
    () => (
      <>
        <Card isFlat style={{ marginTop: '1em' }}>
          <CardHeader>
            <CardTitle>
              <Title headingLevel="h3" size="md">
                {t('AutomatedAnalysisConfigForm.CURRENT_CONFIG')}
              </Title>
            </CardTitle>
            <CardActions>
              {editing && (
                <Button
                  onClick={handleSubmit}
                  variant={'primary'}
                  isDisabled={!formConfig.template.name || !formConfig.template.type}
                >
                  {t('AutomatedAnalysisConfigForm.SAVE_CHANGES')}
                </Button>
              )}
              <Button
                variant="plain"
                onClick={toggleEdit}
                aria-label={editing ? t('CANCEL', { ns: 'common' }) : t('EDIT', { ns: 'common' })}
              >
                {editing ? <CloseIcon /> : <PencilAltIcon />}
              </Button>
            </CardActions>
          </CardHeader>
          <CardBody>
            <Stack hasGutter>
              <StackItem>{targetSelect}</StackItem>
              <StackItem>{configData}</StackItem>
            </Stack>
          </CardBody>
        </Card>
        {authModal}
      </>
    ),
    [t, handleSubmit, toggleEdit, formConfig.template, targetSelect, configData, editing, authModal]
  );

  const formSection = React.useMemo(
    () =>
      useTitle ? (
        <FormSection title={t('AutomatedAnalysisConfigForm.FORM_TITLE')}>{formContent}</FormSection>
      ) : (
        formContent
      ),
    [useTitle, t, formContent]
  );

  return inlineForm ? formSection : <Form>{formSection}</Form>;
};
