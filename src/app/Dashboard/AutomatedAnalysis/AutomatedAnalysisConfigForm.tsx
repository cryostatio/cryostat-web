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
import { LoadingView } from '@app/LoadingView/LoadingView';
import {
  AutomatedAnalysisRecordingConfig,
  automatedAnalysisRecordingName,
  TemplateType,
} from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { SelectTemplateSelectorForm } from '@app/TemplateSelector/SelectTemplateSelectorForm';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Form,
  FormGroup,
  FormSection,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Split,
  SplitItem,
  Text,
  TextInput,
  TextVariants,
  ValidatedOptions,
} from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { concatMap, filter, first, Observable } from 'rxjs';

interface AutomatedAnalysisConfigFormProps {
  useTitle?: boolean;
  targetObs?: Observable<Target>;
}

export const AutomatedAnalysisConfigForm: React.FC<AutomatedAnalysisConfigFormProps> = ({
  useTitle = false,
  targetObs,
}) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const { t } = useTranslation();

  const parseEventString = React.useMemo((): [string | undefined, TemplateType | undefined] => {
    const eventString = context.settings.automatedAnalysisRecordingConfig().template;
    if (!eventString) {
      return [undefined, undefined];
    }
    const templateName = eventString.split(',')[0].split('=')[1];
    const templateType = eventString.split(',')[1].split('=')[1];
    if (!(templateType === 'TARGET' || templateType === 'CUSTOM')) {
      console.error(`Invalid template type ${templateType}`);
      return [undefined, undefined];
    }
    return [templateName, templateType];
  }, [context.settings]);
  const [recordingConfig, setRecordingConfig] = React.useState<AutomatedAnalysisRecordingConfig>(
    context.settings.automatedAnalysisRecordingConfig()
  );
  const [templates, setTemplates] = React.useState([] as EventTemplate[]);
  const [templateName, setTemplateName] = React.useState<string | undefined>(parseEventString[0]);
  const [templateType, setTemplateType] = React.useState<TemplateType | undefined>(parseEventString[1]);
  const [maxAge, setMaxAge] = React.useState(recordingConfig.maxAge);
  const [maxAgeUnits, setMaxAgeUnits] = React.useState(1);
  const [maxSize, setMaxSize] = React.useState(recordingConfig.maxSize);
  const [maxSizeUnits, setMaxSizeUnits] = React.useState(1);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshTemplates = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      (targetObs ? targetObs : context.target.target())
        .pipe(
          filter((target) => target !== NO_TARGET),
          first(),
          concatMap((target) =>
            context.api
              .doGet<EventTemplate[]>(`targets/${encodeURIComponent(target.connectUrl)}/templates`)
              .pipe(first())
          )
        )
        .subscribe({
          next: (templates) => {
            setErrorMessage('');
            setTemplates(templates);
          },
          error: (err) => {
            setErrorMessage(err.message);
            setTemplates([]);
          },
        })
    );
  }, [addSubscription, context.target, context.api, setErrorMessage, setTemplates, setIsLoading, targetObs]);

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
    addSubscription(
      (targetObs ? targetObs : context.target.target()).subscribe(() => {
        refreshTemplates();
        setIsLoading(false);
      })
    );
  }, [addSubscription, targetObs, refreshTemplates, setIsLoading, context.target]);

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
      setTemplateName(templateName);
      setTemplateType(templateType);
      if (!templateName || !templateType) {
        return;
      }
      setAAConfig({
        ...recordingConfig,
        template: getEventString(templateName || '', templateType || ''),
      });
    },
    [recordingConfig, setTemplateName, setTemplateType, setAAConfig, getEventString]
  );

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  const selectedSpecifier = React.useMemo(() => {
    if (templateName && templateType) {
      return `${templateName},${templateType}`;
    }
    return '';
  }, [templateName, templateType]);

  const formContent = React.useMemo(
    () => (
      <>
        <FormGroup
          label={t(`TEMPLATE`, { ns: 'common' })}
          isRequired
          fieldId="recording-template"
          validated={!templateName ? ValidatedOptions.error : ValidatedOptions.success}
          helperText={t('AutomatedAnalysisConfigForm.TEMPLATE_HELPER_TEXT')}
          helperTextInvalid={t('TEMPLATE_HELPER_TEXT_INVALID', { ns: 'common' })}
        >
          <SelectTemplateSelectorForm
            templates={templates}
            validated={!templateName ? ValidatedOptions.error : ValidatedOptions.success}
            onSelect={handleTemplateChange}
            selected={selectedSpecifier}
          />
        </FormGroup>
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
        {templateType == 'TARGET' && (
          <HelperText className={`${automatedAnalysisRecordingName}-config-save-template-warning-helper`}>
            <HelperTextItem variant="warning">
              <Text component={TextVariants.p}>{t('AutomatedAnalysisConfigForm.TEMPLATE_INVALID_WARNING')}</Text>
            </HelperTextItem>
          </HelperText>
        )}
      </>
    ),
    [
      t,
      templateName,
      templateType,
      templates,
      selectedSpecifier,
      maxSize,
      maxSizeUnits,
      maxAge,
      maxAgeUnits,
      handleMaxSizeChange,
      handleMaxAgeChange,
      handleMaxSizeUnitChange,
      handleMaxAgeUnitChange,
      handleTemplateChange,
    ]
  );

  if (errorMessage != '') {
    return (
      <ErrorView
        title={t('AutomatedAnalysisConfigForm.ERROR_TITLE')}
        message={errorMessage}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  }
  if (isLoading) {
    return <LoadingView />;
  }
  return useTitle ? (
    <Form>
      <FormSection title={t('AutomatedAnalysisConfigForm.FORM_TITLE')}>{formContent}</FormSection>
    </Form>
  ) : (
    formContent
  );
};
