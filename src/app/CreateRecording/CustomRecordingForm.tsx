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
import { DurationPicker } from '@app/DurationPicker/DurationPicker';
import { ErrorView } from '@app/ErrorView/ErrorView';
import { authFailMessage, isAuthFail } from '@app/ErrorView/types';
import { RecordingLabelFields } from '@app/RecordingMetadata/RecordingLabelFields';
import { SelectTemplateSelectorForm } from '@app/Shared/Components/SelectTemplateSelectorForm';
import { LoadingProps } from '@app/Shared/Components/types';
import {
  EventTemplate,
  RecordingAttributes,
  AdvancedRecordingOptions,
  Target,
  KeyValue,
} from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  ActionGroup,
  Button,
  Checkbox,
  ExpandableSection,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Icon,
  Label,
  Split,
  SplitItem,
  Text,
  TextContent,
  TextInput,
  TextVariants,
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { forkJoin } from 'rxjs';
import { first } from 'rxjs/operators';
import { EventTemplateIdentifier, CustomRecordingFormData } from './types';
import { isDurationValid, isRecordingNameValid } from './utils';

export const CustomRecordingForm: React.FC = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const navigate = useNavigate();
  const addSubscription = useSubscriptions();
  const location = useLocation();

  const [autoanalyze, setAutoanalyze] = React.useState(true);
  const [formData, setFormData] = React.useState<CustomRecordingFormData>({
    name: '',
    labels: [],
    continuous: false,
    archiveOnStop: true,
    restart: false,
    duration: 30,
    durationUnit: 1000,
    maxAge: 0,
    maxAgeUnit: 1,
    maxSize: 0,
    maxSizeUnit: 1,
    toDisk: true,
    nameValid: ValidatedOptions.default,
    labelsValid: ValidatedOptions.default,
    durationValid: ValidatedOptions.success,
  });
  const [templates, setTemplates] = React.useState<EventTemplate[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const exitForm = React.useCallback(() => navigate('..', { relative: 'path' }), [navigate]);

  const handleCreateRecording = React.useCallback(
    (recordingAttributes: RecordingAttributes) => {
      setLoading(true);
      addSubscription(
        context.api
          .createRecording(recordingAttributes)
          .pipe(first())
          .subscribe((resp) => {
            setLoading(false);
            if (resp && resp.ok) {
              exitForm();
            }
          }),
      );
    },
    [addSubscription, context.api, exitForm, setLoading],
  );

  const handleRestartExistingChange = React.useCallback(
    (_, checked: boolean) => setFormData((old) => ({ ...old, restart: checked })),
    [setFormData],
  );

  const handleContinuousChange = React.useCallback(
    (_, checked: boolean) =>
      setFormData((old) => ({
        ...old,
        continuous: checked,
        duration: 0,
        durationValid: checked ? ValidatedOptions.success : ValidatedOptions.error,
      })),
    [setFormData],
  );

  const handleDurationChange = React.useCallback(
    (value: number) =>
      setFormData((old) => ({
        ...old,
        duration: value,
        durationValid: isDurationValid(value) ? ValidatedOptions.success : ValidatedOptions.error,
      })),
    [setFormData],
  );

  const handleDurationUnitChange = React.useCallback(
    (unit: number) => setFormData((old) => ({ ...old, durationUnit: unit })),
    [setFormData],
  );

  const handleTemplateChange = React.useCallback(
    (template: EventTemplateIdentifier) => setFormData((old) => ({ ...old, template })),
    [setFormData],
  );

  const eventSpecifierString = React.useMemo(() => {
    let str = '';
    const { template } = formData;
    if (template && template.name) {
      str += `template=${template.name}`;
    }
    if (template && template.type) {
      str += `,type=${template.type}`;
    }
    return str;
  }, [formData]);

  const handleRecordingNameChange = React.useCallback(
    (_, name: string) =>
      setFormData((old) => ({
        ...old,
        name: name,
        nameValid: isRecordingNameValid(name) ? ValidatedOptions.success : ValidatedOptions.error,
      })),
    [setFormData],
  );

  const handleMaxAgeChange = React.useCallback(
    (_, value: string) => setFormData((old) => ({ ...old, maxAge: Number(value) })),
    [setFormData],
  );

  const handleMaxAgeUnitChange = React.useCallback(
    (_, unit: string) => setFormData((old) => ({ ...old, maxAgeUnit: Number(unit) })),
    [setFormData],
  );

  const handleMaxSizeChange = React.useCallback(
    (_, value: string) => setFormData((old) => ({ ...old, maxSize: Number(value) })),
    [setFormData],
  );

  const handleMaxSizeUnitChange = React.useCallback(
    (_, unit: string) => setFormData((old) => ({ ...old, maxSizeUnit: Number(unit) })),
    [setFormData],
  );

  const handleToDiskChange = React.useCallback(
    (_, toDisk: boolean) => setFormData((old) => ({ ...old, toDisk })),
    [setFormData],
  );

  const handleLabelsChange = React.useCallback(
    (labels: KeyValue[]) => {
      setFormData((old) => ({ ...old, labels }));
    },
    [setFormData],
  );

  const handleLabelValidationChange = React.useCallback(
    (labelsValid: ValidatedOptions) => setFormData((old) => ({ ...old, labelsValid })),
    [setFormData],
  );

  const handleArchiveOnStopChange = React.useCallback(
    (_, archiveOnStop: boolean) => setFormData((old) => ({ ...old, archiveOnStop })),
    [setFormData],
  );

  const handleAutoAnalyzeChange = React.useCallback(
    (_, autoanalyze: boolean) => setAutoanalyze(autoanalyze),
    [setAutoanalyze],
  );

  const setAdvancedRecordingOptions = React.useCallback(
    (options: AdvancedRecordingOptions) => {
      // toDisk is not set, and defaults to true because of https://github.com/cryostatio/cryostat/issues/263
      setFormData((old) => ({
        ...old,
        maxAge: old.maxAge || options.maxAge || 0,
        maxAgeUnit: old.maxAgeUnit || 1,
        maxSize: old.maxSize || options.maxSize || 0,
        maxSizeUnit: old.maxSizeUnit || 1,
      }));
    },
    [setFormData],
  );

  const handleSubmit = React.useCallback(() => {
    const {
      name,
      nameValid,
      restart,
      toDisk,
      continuous,
      maxAge,
      maxAgeUnit,
      maxSize,
      maxSizeUnit,
      duration,
      durationUnit,
      archiveOnStop,
    } = formData;

    const notificationMessages: string[] = [];
    if (nameValid !== ValidatedOptions.success) {
      notificationMessages.push(t('CustomRecordingForm.RECORDING_NAME_INVALID', { name }));
    }

    if (notificationMessages.length > 0) {
      const message = notificationMessages.join('. ').trim() + '.';
      notifications.warning(t('CustomRecordingForm.FORM_DATA_INVALID'), message);
      return;
    }

    const recordingAttributes: RecordingAttributes = {
      name: name,
      events: eventSpecifierString,
      duration: continuous ? undefined : duration * (durationUnit / 1000),
      archiveOnStop: archiveOnStop && !continuous,
      replace: restart ? 'ALWAYS' : 'NEVER',
      advancedOptions: {
        toDisk: toDisk,
        maxAge: toDisk ? (continuous ? maxAge * maxAgeUnit : undefined) : undefined,
        maxSize: toDisk ? maxSize * maxSizeUnit : undefined,
      },
      metadata: {
        labels: [...formData.labels, { key: 'autoanalyze', value: `${autoanalyze}` }],
      },
    };
    handleCreateRecording(recordingAttributes);
  }, [t, eventSpecifierString, formData, autoanalyze, notifications, handleCreateRecording]);

  const refreshFormOptions = React.useCallback(
    (target: Target) => {
      if (!target) {
        return;
      }
      addSubscription(
        forkJoin({
          templates: context.api.getTargetEventTemplates(target),
          recordingOptions: context.api.doGet<AdvancedRecordingOptions>(`targets/${target.id}/recordingOptions`),
        }).subscribe({
          next: ({ templates, recordingOptions }) => {
            setErrorMessage('');
            setTemplates(templates);
            setFormData((old) => {
              const matched = templates.find((t) => t.name === old.template?.name && t.type === old.template?.type);
              return { ...old, template: matched ? { name: matched.name, type: matched.type } : undefined };
            });
            setAdvancedRecordingOptions(recordingOptions);
          },
          error: (error) => {
            setErrorMessage(error.message);
            setTemplates([]);
            setFormData((old) => ({ ...old, template: undefined }));
            setAdvancedRecordingOptions({});
          },
        }),
      );
    },
    [addSubscription, context.api, setTemplates, setFormData, setAdvancedRecordingOptions, setErrorMessage],
  );

  const isFormInvalid: boolean = React.useMemo(() => {
    return (
      formData.nameValid !== ValidatedOptions.success ||
      formData.durationValid !== ValidatedOptions.success ||
      !formData.template?.name ||
      !formData.template?.type ||
      formData.labelsValid !== ValidatedOptions.success
    );
  }, [formData]);

  const hasReservedLabels = React.useMemo(
    () =>
      formData.labels.some(
        (label) => label.key === 'template.name' || label.key === 'template.type' || label.key === 'autoanalyze',
      ),
    [formData],
  );

  const createButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: t('CustomRecordingForm.CREATING'),
        spinnerAriaLabel: 'create-active-recording',
        isLoading: loading,
      }) as LoadingProps,
    [t, loading],
  );

  const selectedSpecifier = React.useMemo(() => {
    const { template } = formData;
    if (template && template.name && template.type) {
      return `${template.name},${template.type}`;
    }
    return '';
  }, [formData]);

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
        setTemplates([]);
        setFormData((old) => ({ ...old, template: undefined }));
        setAdvancedRecordingOptions({});
      }),
    );
  }, [context.target, setErrorMessage, addSubscription, setTemplates, setFormData, setAdvancedRecordingOptions]);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe(refreshFormOptions));
  }, [addSubscription, context.target, refreshFormOptions]);

  React.useEffect(() => {
    const prefilled: Partial<CustomRecordingFormData> = location.state || {};
    const {
      name,
      restart,
      template,
      labels,
      duration,
      durationUnit,
      maxAge,
      maxAgeUnit,
      maxSize,
      maxSizeUnit,
      continuous,
      skipDurationCheck,
    } = prefilled;
    setFormData((old) => ({
      ...old,
      name: name ?? '',
      nameValid: !name
        ? ValidatedOptions.default
        : isRecordingNameValid(name)
          ? ValidatedOptions.success
          : ValidatedOptions.error,
      template,
      restart: restart ?? false,
      continuous: continuous ?? false,
      labels: labels ?? [],
      labelsValid: ValidatedOptions.default, // RecordingLabelFields component handles validating
      duration: continuous ? 0 : (duration ?? 30),
      durationUnit: durationUnit ?? 1000,
      durationValid:
        skipDurationCheck || continuous || (duration ?? 30) > 0 ? ValidatedOptions.success : ValidatedOptions.error,
      maxAge: maxAge ?? 0,
      maxAgeUnit: maxAgeUnit ?? 1,
      maxSize: maxSize ?? 0,
      maxSizeUnit: maxSizeUnit ?? 1,
    }));
  }, [location, setFormData]);

  if (errorMessage != '') {
    return (
      <ErrorView
        title={t('CustomRecordingForm.FORM_ERROR')}
        message={errorMessage}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  }

  return (
    <>
      <Form isHorizontal>
        <TextContent>
          <Text component={TextVariants.p}>{t('CustomRecordingForm.DESCRIPTION')}</Text>
        </TextContent>
        <FormGroup label={t('CustomRecordingForm.NAME')} isRequired fieldId="recording-name">
          <TextInput
            value={formData.name}
            isRequired
            isDisabled={loading}
            type="text"
            id="recording-name"
            aria-describedby="recording-name-helper"
            onChange={handleRecordingNameChange}
            validated={formData.nameValid}
            data-quickstart-id="crf-name"
          />
          <Checkbox
            label={t('CustomRecordingForm.RESTART_IF_EXISTS')}
            isChecked={formData.restart}
            isDisabled={loading}
            onChange={handleRestartExistingChange}
            aria-label="restartExisting checkbox"
            id="recording-restart-existing"
            name="recording-restart-existing"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={formData.nameValid}>
                {formData.nameValid === ValidatedOptions.error
                  ? t('CustomRecordingForm.RECORDING_NAME_HINT')
                  : t('CustomRecordingForm.RECORDING_NAME_DESCRIPTION')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup
          label={t('CustomRecordingForm.DURATION')}
          isRequired
          fieldId="recording-duration"
          data-quickstart-id="crf-duration"
        >
          <Split hasGutter>
            <SplitItem>
              <Checkbox
                label={t('CONTINUOUS')}
                description={t('CustomRecordingForm.CONTINUOUS_DESCRIPTION')}
                isChecked={formData.continuous}
                isDisabled={loading}
                onChange={handleContinuousChange}
                aria-label="Continuous checkbox"
                id="recording-continuous"
                name="recording-continuous"
              />
            </SplitItem>
            <SplitItem>
              <Checkbox
                label={t('CustomRecordingForm.ARCHIVE_ON_STOP')}
                description={t('CustomRecordingForm.ARCHIVE_ON_STOP_DESCRIPTION')}
                isDisabled={formData.continuous || loading}
                isChecked={formData.archiveOnStop && !formData.continuous}
                onChange={handleArchiveOnStopChange}
                aria-label="ArchiveOnStop checkbox"
                id="recording-archive-on-stop"
                name="recording-archive-on-stop"
              />
            </SplitItem>
          </Split>
          <DurationPicker
            enabled={!formData.continuous && !loading}
            period={formData.duration}
            onPeriodChange={handleDurationChange}
            unitScalar={formData.durationUnit}
            onUnitScalarChange={handleDurationUnitChange}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={formData.durationValid}>
                {formData.durationValid === ValidatedOptions.error
                  ? t('CustomRecordingForm.DURATION_INVALID')
                  : formData.continuous
                    ? t('CustomRecordingForm.DURATION_CONTINUOUS')
                    : formData.archiveOnStop
                      ? t('CustomRecordingForm.DURATION_DESCRIPTION_ARCHIVE_ON_STOP')
                      : t('CustomRecordingForm.DURATION_DESCRIPTION')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup label={t('CustomRecordingForm.TEMPLATE')} isRequired fieldId="recording-template">
          <SelectTemplateSelectorForm
            selected={selectedSpecifier}
            templates={templates}
            validated={!formData.template?.name ? ValidatedOptions.default : ValidatedOptions.success}
            disabled={loading}
            onSelect={handleTemplateChange}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={!formData.template?.name ? ValidatedOptions.default : ValidatedOptions.success}>
                {formData.template?.name
                  ? t('CustomRecordingForm.TEMPLATE_DESCRIPTION')
                  : t('CustomRecordingForm.TEMPLATE_INVALID')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <ExpandableSection
          toggleTextExpanded={t('CustomRecordingForm.METADATA_HIDE')}
          toggleTextCollapsed={t('CustomRecordingForm.METADATA_SHOW')}
          data-quickstart-id="crf-metadata-opt"
          toggleId="metadata-option-toggle"
          contentId="metadata-options"
        >
          <FormGroup
            label={t('CustomRecordingForm.LABELS')}
            fieldId="labels"
            labelIcon={
              <Tooltip content={<Text>{t('CustomRecordingForm.LABELS_TOOLTIP')}</Text>} appendTo={portalRoot}>
                <Icon>
                  <HelpIcon />
                </Icon>
              </Tooltip>
            }
          >
            <Checkbox
              label={t('CustomRecordingForm.AUTOMATICALLY_ANALYZE')}
              description={t('AUTOANALYZE_HELPER_TEXT')}
              isDisabled={loading}
              isChecked={autoanalyze}
              onChange={handleAutoAnalyzeChange}
              aria-label="Autoanalyze checkbox"
              id="autoanalyze"
              name="autoanalyze"
            />
            <RecordingLabelFields
              labels={formData.labels}
              setLabels={handleLabelsChange}
              setValid={handleLabelValidationChange}
              isDisabled={loading}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem
                  isDynamic
                  variant={hasReservedLabels ? 'warning' : undefined}
                  hasIcon={hasReservedLabels}
                >
                  <Trans t={t} components={[<Label isCompact />]}>
                    CustomRecordingForm.LABELS_DESCRIPTION
                  </Trans>
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </ExpandableSection>
        <ExpandableSection
          toggleTextExpanded={t('CustomRecordingForm.ADVANCED_OPTIONS_HIDE')}
          toggleTextCollapsed={t('CustomRecordingForm.ADVANCED_OPTIONS_SHOW')}
          data-quickstart-id="crf-advanced-opt"
          toggleId="advanced-option-toggle"
          contentId="advanced-options"
        >
          <Text component={TextVariants.small}>{t('CustomRecordingForm.UNBOUNDED')}</Text>
          <FormGroup fieldId={t('CustomRecordingForm.TO_DISK')}>
            <Checkbox
              label={t('CustomRecordingForm.TO_DISK')}
              id="toDisk-checkbox"
              isChecked={formData.toDisk}
              onChange={handleToDiskChange}
              isDisabled={loading}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{t('CustomRecordingForm.TO_DISK_DESCRIPTION')}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label={t('CustomRecordingForm.MAXIMUM_SIZE')} fieldId="maxSize">
            <Split hasGutter={true}>
              <SplitItem isFilled>
                <TextInput
                  value={formData.maxSize}
                  isRequired
                  type="number"
                  id="maxSize"
                  aria-label="max size value"
                  onChange={handleMaxSizeChange}
                  min="0"
                  isDisabled={!formData.toDisk || loading}
                />
              </SplitItem>
              <SplitItem>
                <FormSelect
                  value={formData.maxSizeUnit}
                  onChange={handleMaxSizeUnitChange}
                  aria-label="Max size units input"
                  isDisabled={!formData.toDisk || loading}
                >
                  <FormSelectOption key="1" value="1" label="B" />
                  <FormSelectOption key="2" value={1024} label="KiB" />
                  <FormSelectOption key="3" value={1024 * 1024} label="MiB" />
                </FormSelect>
              </SplitItem>
            </Split>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{t('CustomRecordingForm.MAXIMUM_SIZE_DESCRIPTION')}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label={t('CustomRecordingForm.MAXIMUM_AGE')} fieldId="maxAge">
            <Split hasGutter={true}>
              <SplitItem isFilled>
                <TextInput
                  value={formData.maxAge}
                  isRequired
                  type="number"
                  id="maxAgeDuration"
                  aria-label="Max age duration"
                  onChange={handleMaxAgeChange}
                  min="0"
                  isDisabled={!formData.continuous || !formData.toDisk || loading}
                />
              </SplitItem>
              <SplitItem>
                <FormSelect
                  className="recording-create__form_select"
                  value={formData.maxAgeUnit}
                  onChange={handleMaxAgeUnitChange}
                  aria-label="Max Age units Input"
                  isDisabled={!formData.continuous || !formData.toDisk || loading}
                >
                  <FormSelectOption key="1" value="1" label="Seconds" />
                  <FormSelectOption key="2" value={60} label="Minutes" />
                  <FormSelectOption key="3" value={60 * 60} label="Hours" />
                </FormSelect>
              </SplitItem>
            </Split>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{t('CustomRecordingForm.MAXIMUM_AGE_DESCRIPTION')}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </ExpandableSection>
        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isDisabled={isFormInvalid || loading}
            {...createButtonLoadingProps}
            data-quickstart-id="crf-create-btn"
          >
            {loading ? t('CREATING') : t('CREATE')}
          </Button>
          <Button variant="secondary" onClick={exitForm} isDisabled={loading}>
            {t('CANCEL')}
          </Button>
        </ActionGroup>
      </Form>
    </>
  );
};
