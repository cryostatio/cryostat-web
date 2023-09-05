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
import { authFailMessage, ErrorView, isAuthFail } from '@app/ErrorView/ErrorView';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { RecordingLabel } from '@app/RecordingMetadata/RecordingLabel';
import { RecordingLabelFields } from '@app/RecordingMetadata/RecordingLabelFields';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
import { SelectTemplateSelectorForm } from '@app/Shared/SelectTemplateSelectorForm';
import { RecordingOptions, RecordingAttributes, TemplateType } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { isTargetAgentHttp, NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import {
  ActionGroup,
  Button,
  Checkbox,
  ExpandableSection,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Label,
  Split,
  SplitItem,
  Text,
  TextInput,
  TextVariants,
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { forkJoin } from 'rxjs';
import { first } from 'rxjs/operators';
import { EventTemplate } from './CreateRecording';

export interface CustomRecordingFormProps {
  prefilled?: {
    restartExisting?: boolean;
    name?: string;
    templateName?: string;
    templateType?: TemplateType;
    labels?: RecordingLabel[];
    duration?: number;
    maxAge?: number;
    maxSize?: number;
  };
}

export const RecordingNamePattern = /^[\w_]+$/;
export const DurationPattern = /^[1-9][0-9]*$/;

export const CustomRecordingForm: React.FC<CustomRecordingFormProps> = ({ prefilled }) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const history = useHistory();
  const addSubscription = useSubscriptions();

  const [recordingName, setRecordingName] = React.useState(prefilled?.name || '');
  const [nameValid, setNameValid] = React.useState(
    prefilled?.name
      ? RecordingNamePattern.test(recordingName)
        ? ValidatedOptions.success
        : ValidatedOptions.error
      : ValidatedOptions.default,
  );
  const [restartExisting, setRestartExisting] = React.useState(prefilled?.restartExisting || false);
  const [continuous, setContinuous] = React.useState((prefilled?.duration || 30) < 1);
  const [archiveOnStop, setArchiveOnStop] = React.useState(true);
  const [duration, setDuration] = React.useState(prefilled?.duration || 30);
  const [durationUnit, setDurationUnit] = React.useState(1000);
  const [durationValid, setDurationValid] = React.useState(ValidatedOptions.success);
  const [templates, setTemplates] = React.useState<EventTemplate[]>([]);
  const [template, setTemplate] = React.useState<Pick<Partial<EventTemplate>, 'name' | 'type'>>({
    name: prefilled?.templateName,
    type: prefilled?.templateType,
  });
  const [maxAge, setMaxAge] = React.useState(prefilled?.maxAge || 0);
  const [maxAgeUnits, setMaxAgeUnits] = React.useState(1);
  const [maxSize, setMaxSize] = React.useState(prefilled?.maxSize || 0);
  const [maxSizeUnits, setMaxSizeUnits] = React.useState(1);
  const [toDisk, setToDisk] = React.useState(true);
  const [labels, setLabels] = React.useState(prefilled?.labels || []);
  const [labelsValid, setLabelsValid] = React.useState(ValidatedOptions.default);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

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
              history.goBack();
            }
          }),
      );
    },
    [addSubscription, context.api, history, setLoading],
  );

  const handleRestartExistingChange = React.useCallback(
    (checked) => {
      setRestartExisting(checked);
    },
    [setRestartExisting],
  );

  const handleContinuousChange = React.useCallback(
    (checked) => {
      setContinuous(checked);
      setDuration(0);
      setDurationValid(checked ? ValidatedOptions.success : ValidatedOptions.error);
    },
    [setContinuous, setDuration, setDurationValid],
  );

  const handleDurationChange = React.useCallback(
    (evt) => {
      setDuration(Number(evt));
      setDurationValid(DurationPattern.test(evt) ? ValidatedOptions.success : ValidatedOptions.error);
    },
    [setDurationValid, setDuration],
  );

  const handleDurationUnitChange = React.useCallback(
    (evt) => {
      setDurationUnit(Number(evt));
    },
    [setDurationUnit],
  );

  const handleTemplateChange = React.useCallback(
    (templateName?: string, templateType?: TemplateType) => {
      setTemplate({
        name: templateName,
        type: templateType,
      });
    },
    [setTemplate],
  );

  const eventSpecifierString = React.useMemo(() => {
    let str = '';
    const { name, type } = template;
    if (name) {
      str += `template=${name}`;
    }
    if (type) {
      str += `,type=${type}`;
    }
    return str;
  }, [template]);

  const getFormattedLabels = React.useCallback(() => {
    const obj = {};

    labels.forEach((l) => {
      if (!!l.key && !!l.value) {
        obj[l.key] = l.value;
      }
    });

    return obj;
  }, [labels]);

  const handleRecordingNameChange = React.useCallback(
    (name) => {
      setNameValid(RecordingNamePattern.test(name) ? ValidatedOptions.success : ValidatedOptions.error);
      setRecordingName(name);
    },
    [setNameValid, setRecordingName],
  );

  const handleMaxAgeChange = React.useCallback(
    (evt) => {
      setMaxAge(Number(evt));
    },
    [setMaxAge],
  );

  const handleMaxAgeUnitChange = React.useCallback(
    (evt) => {
      setMaxAgeUnits(Number(evt));
    },
    [setMaxAgeUnits],
  );

  const handleMaxSizeChange = React.useCallback(
    (evt) => {
      setMaxSize(Number(evt));
    },
    [setMaxSize],
  );

  const handleMaxSizeUnitChange = React.useCallback(
    (evt) => {
      setMaxSizeUnits(Number(evt));
    },
    [setMaxSizeUnits],
  );

  const handleToDiskChange = React.useCallback(
    (checked, evt) => {
      setToDisk(evt.target.checked);
    },
    [setToDisk],
  );

  const setRecordingOptions = React.useCallback(
    (options: RecordingOptions) => {
      // toDisk is not set, and defaults to true because of https://github.com/cryostatio/cryostat/issues/263
      setMaxAge(prefilled?.maxAge || options.maxAge || 0);
      setMaxAgeUnits(1);
      setMaxSize(prefilled?.maxSize || options.maxSize || 0);
      setMaxSizeUnits(1);
    },
    [setMaxAge, setMaxAgeUnits, setMaxSize, setMaxSizeUnits, prefilled],
  );

  const handleSubmit = React.useCallback(() => {
    const notificationMessages: string[] = [];
    if (nameValid !== ValidatedOptions.success) {
      notificationMessages.push(`Recording name ${recordingName} is invalid`);
    }

    if (notificationMessages.length > 0) {
      const message = notificationMessages.join('. ').trim() + '.';
      notifications.warning('Invalid form data', message);
      return;
    }

    const options: RecordingOptions = {
      restart: restartExisting,
      toDisk: toDisk,
      maxAge: toDisk ? (continuous ? maxAge * maxAgeUnits : undefined) : undefined,
      maxSize: toDisk ? maxSize * maxSizeUnits : undefined,
    };
    const recordingAttributes: RecordingAttributes = {
      name: recordingName,
      events: eventSpecifierString,
      duration: continuous ? undefined : duration * (durationUnit / 1000),
      archiveOnStop: archiveOnStop && !continuous,
      options: options,
      metadata: { labels: getFormattedLabels() },
    };
    handleCreateRecording(recordingAttributes);
  }, [
    eventSpecifierString,
    getFormattedLabels,
    archiveOnStop,
    continuous,
    duration,
    durationUnit,
    maxAge,
    maxAgeUnits,
    maxSize,
    maxSizeUnits,
    nameValid,
    notifications,
    recordingName,
    restartExisting,
    toDisk,
    handleCreateRecording,
  ]);

  const refreshFormOptions = React.useCallback(
    (target: Target) => {
      if (target === NO_TARGET) {
        return;
      }
      addSubscription(
        forkJoin({
          templates: context.api.doGet<EventTemplate[]>(`targets/${encodeURIComponent(target.connectUrl)}/templates`),
          recordingOptions: context.api.doGet<RecordingOptions>(
            `targets/${encodeURIComponent(target.connectUrl)}/recordingOptions`,
          ),
        }).subscribe({
          next: ({ templates, recordingOptions }) => {
            setErrorMessage('');
            setTemplates(templates);
            setTemplate((old) => {
              const matched = templates.find((t) => t.name === old.name && t.type === t.type);
              return matched ? { name: matched.name, type: matched.type } : {};
            });
            setRecordingOptions(recordingOptions);
          },
          error: (error) => {
            setErrorMessage(isTargetAgentHttp(target) ? 'Unsupported operation: Create recordings' : error.message); // If both throw, first error will be shown
            setTemplates([]);
            setTemplate({});
            setRecordingOptions({});
          },
        }),
      );
    },
    [addSubscription, context.api, setTemplates, setTemplate, setRecordingOptions, setErrorMessage],
  );

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        setErrorMessage(authFailMessage);
        setTemplates([]);
        setTemplate({});
        setRecordingOptions({});
      }),
    );
  }, [context.target, setErrorMessage, addSubscription, setTemplates, setTemplate, setRecordingOptions]);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe(refreshFormOptions));
  }, [addSubscription, context.target, refreshFormOptions]);

  const isFormInvalid: boolean = React.useMemo(() => {
    return (
      nameValid !== ValidatedOptions.success ||
      durationValid !== ValidatedOptions.success ||
      !template.name ||
      !template.type ||
      labelsValid !== ValidatedOptions.success
    );
  }, [nameValid, durationValid, template, labelsValid]);

  const hasReservedLabels = React.useMemo(
    () => labels.some((label) => label.key === 'template.name' || label.key === 'template.type'),
    [labels],
  );

  const createButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Creating',
        spinnerAriaLabel: 'create-active-recording',
        isLoading: loading,
      }) as LoadingPropsType,
    [loading],
  );

  const selectedSpecifier = React.useMemo(() => {
    const { name, type } = template;
    if (name && type) {
      return `${name},${type}`;
    }
    return '';
  }, [template]);

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  if (errorMessage != '') {
    return (
      <ErrorView
        title={'Error displaying recording creation form'}
        message={errorMessage}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  }
  return (
    <>
      <Text component={TextVariants.small}>
        JDK Flight Recordings are compact records of events which have occurred within the target JVM. Many event types
        are built in to the JVM itself, while others are user defined.
      </Text>
      <Form isHorizontal>
        <FormGroup
          label="Name"
          isRequired
          fieldId="recording-name"
          helperText="Enter a recording name. This will be unique within the target JVM."
          helperTextInvalid="A recording name can contain only letters, numbers, and underscores."
          validated={nameValid}
        >
          <TextInput
            value={recordingName}
            isRequired
            isDisabled={loading}
            type="text"
            id="recording-name"
            aria-describedby="recording-name-helper"
            onChange={handleRecordingNameChange}
            validated={nameValid}
            data-quickstart-id="crf-name"
          />
          <Checkbox
            label="Restart if recording already exists"
            isChecked={restartExisting}
            isDisabled={loading}
            onChange={handleRestartExistingChange}
            aria-label="restartExisting checkbox"
            id="recording-restart-existing"
            name="recording-restart-existing"
          />
        </FormGroup>
        <FormGroup
          label="Duration"
          isRequired
          fieldId="recording-duration"
          validated={durationValid}
          helperText={
            continuous
              ? 'A continuous recording will never be automatically stopped.'
              : archiveOnStop
              ? 'Time before the recording is automatically stopped and copied to archive.'
              : 'Time before the recording is automatically stopped.'
          }
          helperTextInvalid="The recording duration must be a positive integer."
          data-quickstart-id="crf-duration"
        >
          <Split hasGutter>
            <SplitItem>
              <Checkbox
                label="Continuous"
                isChecked={continuous}
                isDisabled={loading}
                onChange={handleContinuousChange}
                aria-label="Continuous checkbox"
                id="recording-continuous"
                name="recording-continuous"
              />
            </SplitItem>
            <SplitItem>
              <Checkbox
                label="Archive on Stop"
                isDisabled={continuous || loading}
                isChecked={archiveOnStop && !continuous}
                onChange={setArchiveOnStop}
                aria-label="ArchiveOnStop checkbox"
                id="recording-archive-on-stop"
                name="recording-archive-on-stop"
              />
            </SplitItem>
          </Split>
          <DurationPicker
            enabled={!continuous && !loading}
            period={duration}
            onPeriodChange={handleDurationChange}
            unitScalar={durationUnit}
            onUnitScalarChange={handleDurationUnitChange}
          />
        </FormGroup>
        <FormGroup
          label="Template"
          isRequired
          fieldId="recording-template"
          validated={!template.name ? ValidatedOptions.default : ValidatedOptions.success}
          helperText={'The Event Template to be applied in this recording'}
          helperTextInvalid="A Template must be selected"
        >
          <SelectTemplateSelectorForm
            selected={selectedSpecifier}
            templates={templates}
            validated={!template.name ? ValidatedOptions.default : ValidatedOptions.success}
            disabled={loading}
            onSelect={handleTemplateChange}
          />
        </FormGroup>
        <ExpandableSection
          toggleTextExpanded="Hide metadata options"
          toggleTextCollapsed="Show metadata options"
          data-quickstart-id="crf-metadata-opt"
        >
          <FormGroup
            label="Labels"
            fieldId="labels"
            labelIcon={
              <Tooltip
                content={<Text>Unique key-value pairs containing information about the recording.</Text>}
                appendTo={portalRoot}
              >
                <HelpIcon noVerticalAlign />
              </Tooltip>
            }
            isHelperTextBeforeField
            helperText={
              <HelperText>
                <HelperTextItem
                  isDynamic
                  variant={hasReservedLabels ? 'warning' : undefined}
                  hasIcon={hasReservedLabels}
                >
                  Labels with key <Label isCompact>template.name</Label> and <Label isCompact>template.type</Label> are
                  set by Cryostat and will be overwritten if specifed.
                </HelperTextItem>
              </HelperText>
            }
          >
            <RecordingLabelFields
              labels={labels}
              setLabels={setLabels}
              setValid={setLabelsValid}
              isDisabled={loading}
            />
          </FormGroup>
        </ExpandableSection>
        <ExpandableSection
          toggleTextExpanded="Hide advanced options"
          toggleTextCollapsed="Show advanced options"
          data-quickstart-id="crf-advanced-opt"
        >
          <Text component={TextVariants.small}>A value of 0 for maximum size or age means unbounded.</Text>
          <FormGroup
            fieldId="To Disk"
            helperText="Write contents of buffer onto disk. If disabled, the buffer acts as circular buffer only keeping the most recent recording information"
          >
            <Checkbox
              label="To Disk"
              id="toDisk-checkbox"
              isChecked={toDisk}
              onChange={handleToDiskChange}
              isDisabled={loading}
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
                  isDisabled={!toDisk || loading}
                />
              </SplitItem>
              <SplitItem>
                <FormSelect
                  value={maxSizeUnits}
                  onChange={handleMaxSizeUnitChange}
                  aria-label="Max size units input"
                  isDisabled={!toDisk || loading}
                >
                  <FormSelectOption key="1" value="1" label="B" />
                  <FormSelectOption key="2" value={1024} label="KiB" />
                  <FormSelectOption key="3" value={1024 * 1024} label="MiB" />
                </FormSelect>
              </SplitItem>
            </Split>
          </FormGroup>
          <FormGroup label="Maximum age" fieldId="maxAge" helperText="The maximum age of recording data stored to disk">
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
                  isDisabled={!continuous || !toDisk || loading}
                />
              </SplitItem>
              <SplitItem>
                <FormSelect
                  value={maxAgeUnits}
                  onChange={handleMaxAgeUnitChange}
                  aria-label="Max Age units Input"
                  isDisabled={!continuous || !toDisk || loading}
                >
                  <FormSelectOption key="1" value="1" label="Seconds" />
                  <FormSelectOption key="2" value={60} label="Minutes" />
                  <FormSelectOption key="3" value={60 * 60} label="Hours" />
                </FormSelect>
              </SplitItem>
            </Split>
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
            {loading ? 'Creating' : 'Create'}
          </Button>
          <Button variant="secondary" onClick={history.goBack} isDisabled={loading}>
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </>
  );
};
