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
import { EventTemplate } from '@app/CreateRecording/CreateRecording';
import { authFailMessage, ErrorView, isAuthFail } from '@app/ErrorView/ErrorView';
import { SelectTemplateSelectorForm } from '@app/Shared/SelectTemplateSelectorForm';
import {
  AutomatedAnalysisRecordingConfig,
  automatedAnalysisRecordingName,
  defaultAutomatedAnalysisRecordingConfig,
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
import { concatMap, filter, first, of, take, tap, timeout } from 'rxjs';

interface AutomatedAnalysisConfigFormProps {
  useTitle?: boolean;
  inlineForm?: boolean;
}

export const AutomatedAnalysisConfigForm: React.FC<AutomatedAnalysisConfigFormProps> = ({
  useTitle = false,
  inlineForm = false,
}) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const { t } = useTranslation();

  const parseEventString = React.useMemo((): Pick<Partial<EventTemplate>, 'name' | 'type'> => {
    const eventString = context.settings.automatedAnalysisRecordingConfig().template;
    if (!eventString) {
      return {};
    }
    const templateName = eventString.split(',')[0].split('=')[1];
    const templateType = eventString.split(',')[1].split('=')[1];
    if (!(templateType === 'TARGET' || templateType === 'CUSTOM')) {
      console.error(`Invalid template type ${templateType}`);
      return {};
    }
    return {
      name: templateName,
      type: templateType,
    };
  }, [context.settings]);

  const [recordingConfig, setRecordingConfig] = React.useState<AutomatedAnalysisRecordingConfig>(
    context.settings.automatedAnalysisRecordingConfig()
  );

  const [templates, setTemplates] = React.useState<EventTemplate[]>([]);
  const [template, setTemplate] = React.useState<Pick<Partial<EventTemplate>, 'name' | 'type'>>(parseEventString);
  const [maxAge, setMaxAge] = React.useState(recordingConfig.maxAge);
  const [maxAgeUnits, setMaxAgeUnits] = React.useState(1);
  const [maxSize, setMaxSize] = React.useState(recordingConfig.maxSize);
  const [maxSizeUnits, setMaxSizeUnits] = React.useState(1);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const refreshTemplates = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.target
        .target()
        .pipe(
          take(1),
          concatMap((target) => {
            if (target === NO_TARGET) {
              return of([]);
            }
            return context.api
              .doGet<EventTemplate[]>(`targets/${encodeURIComponent(target.connectUrl)}/templates`)
              .pipe(first());
          })
        )
        .subscribe({
          next: (templates) => {
            setErrorMessage('');
            setTemplates(templates);
            setTemplate((old) => {
              const matched = templates.find((t) => t.name === old.name && t.type === t.type);
              return matched ? { name: matched.name, type: matched.type } : {};
            });
          },
          error: (err) => {
            setErrorMessage(err.message);
            setTemplates([]);
            setTemplate({});
          },
          complete: () => {
            setIsLoading(false);
          },
        })
    );
  }, [addSubscription, context.api, context.target, setErrorMessage, setTemplates, setTemplate, setIsLoading]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
        setTemplates([]);
        setIsLoading(false);
      })
    );
  }, [addSubscription, context.target, setErrorMessage, setTemplates, setIsLoading]);

  React.useEffect(() => {
    if (!editing) {
      return;
    }
    addSubscription(
      context.target.target().subscribe(() => {
        refreshTemplates();
      })
    );
  }, [addSubscription, context.target, refreshTemplates, setIsLoading, editing]);

  const getEventString = React.useCallback((templateName: string, templateType: string) => {
    let str = '';
    if (templateName) {
      str += `template=${templateName}`;
    }
    if (templateType) {
      str += `,type=${templateType}`;
    }
    return str;
  }, []);

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
      setMaxAge(Number(evt));
      setAAConfig({ ...recordingConfig, maxAge: Number(evt) * maxAgeUnits });
    },
    [setMaxAge, setAAConfig, recordingConfig, maxAgeUnits]
  );

  const handleMaxAgeUnitChange = React.useCallback(
    (evt) => {
      setMaxAgeUnits(Number(evt));
      setAAConfig({ ...recordingConfig, maxAge: Number(evt) * maxAge });
    },
    [setMaxAgeUnits, setAAConfig, recordingConfig, maxAge]
  );

  const handleMaxSizeChange = React.useCallback(
    (evt) => {
      setMaxSize(Number(evt));
      setAAConfig({ ...recordingConfig, maxSize: Number(evt) * maxSizeUnits });
    },
    [setMaxSize, setAAConfig, recordingConfig, maxSizeUnits]
  );

  const handleMaxSizeUnitChange = React.useCallback(
    (evt) => {
      setMaxSizeUnits(Number(evt));
      setAAConfig({ ...recordingConfig, maxSize: Number(evt) * maxSize });
    },
    [setMaxSizeUnits, setAAConfig, recordingConfig, maxSize]
  );

  const handleTemplateChange = React.useCallback(
    (templateName?: string, templateType?: TemplateType) => {
      setTemplate({
        name: templateName,
        type: templateType,
      });
      setAAConfig({
        ...recordingConfig,
        template: getEventString(templateName || '', templateType || ''),
      });
    },
    [setTemplate, recordingConfig, getEventString, setAAConfig]
  );

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const reset = React.useCallback(() => {
    setTemplate({
      name: 'Continuous',
      type: 'TARGET',
    });
    setMaxAgeUnits(1);
    setMaxAge(defaultAutomatedAnalysisRecordingConfig.maxAge);
    setMaxSizeUnits(1);
    setMaxSize(defaultAutomatedAnalysisRecordingConfig.maxSize);
    setAAConfig(defaultAutomatedAnalysisRecordingConfig);
  }, [setTemplate, setMaxAgeUnits, setMaxAge, setMaxSizeUnits, setMaxSize, setAAConfig]);

  const selectedSpecifier = React.useMemo(() => {
    const { name, type } = template;
    if (name && type) {
      return `${name},${type}`;
    }
    return '';
  }, [template]);

  const targetSelect = React.useMemo(() => {
    return (
      editing && (
        <StackItem>
          <TargetSelect simple />
        </StackItem>
      )
    );
  }, [editing]);

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
                    {template.type == 'TARGET' && (
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
                    value={maxSize}
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
                    value={maxSizeUnits}
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
                    value={maxAge}
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
                    value={maxAgeUnits}
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
          <DescriptionListDescription>{recordingConfig.template}</DescriptionListDescription>
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
    maxSize,
    maxSizeUnits,
    maxAge,
    maxAgeUnits,
    template,
    templates,
    selectedSpecifier,
    handleTemplateChange,
    handleMaxSizeChange,
    handleMaxSizeUnitChange,
    handleMaxAgeChange,
    handleMaxAgeUnitChange,
    errorMessage,
    authRetry,
    recordingConfig,
  ]);

  const toggleEdit = React.useCallback(() => {
    setEditing((edit) => !edit);
  }, [setEditing]);

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
              <Button variant="link" onClick={reset}>
                {t('AutomatedAnalysisConfigForm.RESET')}
              </Button>
              <Button
                variant={editing ? 'plain' : 'primary'}
                icon={editing ? <CloseIcon /> : <PencilAltIcon />}
                onClick={toggleEdit}
              />
            </CardActions>
          </CardHeader>
          <CardBody>
            <Stack hasGutter>
              {targetSelect}
              <StackItem>{configData}</StackItem>
            </Stack>
          </CardBody>
        </Card>
      </>
    ),
    [t, editing, reset, toggleEdit, targetSelect, configData]
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
