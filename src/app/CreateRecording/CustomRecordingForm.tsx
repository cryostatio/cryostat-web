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
import * as React from 'react';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { ServiceContext } from '@app/Shared/Services/Services';
import { ActionGroup, Button, Checkbox, ExpandableSection, Form, FormGroup, FormSelect, FormSelectOption, FormSelectOptionGroup, Split, SplitItem, Text, TextArea, TextInput, TextVariants, Tooltip, TooltipPosition, ValidatedOptions } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { useHistory } from 'react-router-dom';
import { concatMap } from 'rxjs/operators';
import { EventTemplate, TemplateType } from './CreateRecording';
import { RecordingOptions, RecordingAttributes } from '@app/Shared/Services/Api.service';
import { DurationPicker } from '@app/DurationPicker/DurationPicker';
import { FormSelectTemplateSelector } from '../TemplateSelector/FormSelectTemplateSelector';
import { RecordingLabel } from '@app/RecordingMetadata/RecordingLabel';
import { RecordingLabelFields } from '@app/RecordingMetadata/RecordingLabelFields';

export interface CustomRecordingFormProps {
  onSubmit: (recordingAttributes: RecordingAttributes) => void;
}

export const RecordingNamePattern = /^[\w_]+$/;

export const CustomRecordingForm = (props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const history = useHistory();

  const [recordingName, setRecordingName] = React.useState(props.recordingName || props?.location?.state?.recordingName || '');
  const [nameValid, setNameValid] = React.useState(ValidatedOptions.default);
  const [continuous, setContinuous] = React.useState(false);
  const [duration, setDuration] = React.useState(30);
  const [durationUnit, setDurationUnit] = React.useState(1000);
  const [templates, setTemplates] = React.useState([] as EventTemplate[]);
  const [template, setTemplate] = React.useState(props.template || props?.location?.state?.template ||  null);
  const [templateType, setTemplateType] = React.useState(props.templateType || props?.location?.state?.templateType || null as TemplateType | null);
  const [maxAge, setMaxAge] = React.useState(0);
  const [maxAgeUnits, setMaxAgeUnits] = React.useState(1);
  const [maxSize, setMaxSize] = React.useState(0);
  const [maxSizeUnits, setMaxSizeUnits] = React.useState(1);
  const [toDisk, setToDisk] = React.useState(true);
  const [labels, setLabels] = React.useState([] as RecordingLabel[]);
  const [labelsValid, setLabelsValid] = React.useState(ValidatedOptions.default);

  const handleContinuousChange = (checked, evt) => {
    setContinuous(evt.target.checked);
  };

  const handleDurationChange = (evt) => {
    setDuration(Number(evt));
  };

  const handleDurationUnitChange = (evt) => {
    setDurationUnit(Number(evt));
  };

  const handleTemplateChange = (template) => {
    const parts: string[] = template.split(',');
    setTemplate(parts[0]);
    setTemplateType(parts[1]);
  };

  const getEventString = () => {
    var str = '';
    if (!!template) {
      str += `template=${template}`;
    }
    if (!!templateType) {
      str += `,type=${templateType}`;
    }
    return str;
  };

  const getFormattedLabels = () => {
    let obj = {};
  
      labels.forEach(l => { 
        if(!!l.key && !!l.value) {
          obj[l.key] = l.value;
        }
      });

    return obj;
  }

  const handleRecordingNameChange = (name) => {
    setNameValid(RecordingNamePattern.test(name) ? ValidatedOptions.success : ValidatedOptions.error);
    setRecordingName(name);
  };

  const handleMaxAgeChange = (evt) => {
    setMaxAge(Number(evt));
  };

  const handleMaxAgeUnitChange = (evt) => {
    setMaxAgeUnits(Number(evt));
  };

  const handleMaxSizeChange = (evt) => {
    setMaxSize(Number(evt));
  };

  const handleMaxSizeUnitChange = (evt) => {
    setMaxSizeUnits(Number(evt));
  };

  const handleToDiskChange = (checked, evt) => {
    setToDisk(evt.target.checked);
  };

  const setRecordingOptions = (options: RecordingOptions) => {
    // toDisk is not set, and defaults to true because of https://github.com/cryostatio/cryostat/issues/263
    setMaxAge(options.maxAge || 0);
    setMaxAgeUnits(1);
    setMaxSize(options.maxSize || 0);
    setMaxSizeUnits(1);
  };

  const handleSubmit = () => {
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
      toDisk: toDisk,
      maxAge: toDisk? continuous? maxAge * maxAgeUnits : undefined : undefined,
      maxSize: toDisk? maxSize * maxSizeUnits : undefined
    }
    const recordingAttributes: RecordingAttributes = {
      name: recordingName,
      events: getEventString(),
      duration: continuous ? undefined : duration * (durationUnit/1000),
      options: options,
      metadata: { labels: getFormattedLabels() }
    }
    props.onSubmit(recordingAttributes);
  };

  React.useEffect(() => {
    const sub = context.target.target().pipe(concatMap(target => context.api.doGet<EventTemplate[]>(`targets/${encodeURIComponent(target.connectUrl)}/templates`))).subscribe(setTemplates);
    return () => sub.unsubscribe();
  }, []);

  React.useEffect(() => {
    const sub = context.target.target()
      .pipe(concatMap(target => context.api.doGet<RecordingOptions>(`targets/${encodeURIComponent(target.connectUrl)}/recordingOptions`)))
      .subscribe(options => setRecordingOptions(options));
    return () => sub.unsubscribe();
  }, []);

  return (<>
    <Text component={TextVariants.small}>
      JDK Flight Recordings are compact records of events which have occurred within the target JVM.
      Many event types are built-in to the JVM itself, while others are user-defined.
    </Text>
    <Form isHorizontal>
      <FormGroup
        label="Name"
        isRequired
        fieldId="recording-name"
        helperText="Enter a recording name. This will be unique within the target JVM"
        helperTextInvalid="A recording name may only contain letters, numbers, and underscores"
        validated={nameValid}
      >
        <TextInput
          value={recordingName}
          isRequired
          type="text"
          id="recording-name"
          aria-describedby="recording-name-helper"
          onChange={handleRecordingNameChange}
          validated={nameValid}
        />
      </FormGroup>
      <FormGroup
        label="Duration"
        isRequired
        fieldId="recording-duration"
        helperText="Time before the recording is automatically stopped"
      >
        <Checkbox
          label="Continuous"
          isChecked={continuous}
          onChange={handleContinuousChange}
          aria-label="Continuous checkbox"
          id="recording-continuous"
          name="recording-continuous"
        />
        <DurationPicker enabled={!continuous} period={duration} onPeriodChange={handleDurationChange} unitScalar={durationUnit} onUnitScalarChange={handleDurationUnitChange} />
      </FormGroup>
      <FormGroup
        label="Template"
        isRequired
        fieldId="recording-template"
        validated={template === null ? ValidatedOptions.default : !!template ? ValidatedOptions.success : ValidatedOptions.error}
        helperTextInvalid="A Template must be selected"
      >
        <FormSelectTemplateSelector
          selected={`${template},${templateType}`}
          templates={templates}
          onChange={handleTemplateChange}
        />
      </FormGroup>
      <ExpandableSection toggleTextExpanded="Hide metadata options" toggleTextCollapsed="Show metadata options">
      <FormGroup
      label="Labels"
      fieldId="labels"
      labelIcon={
        <Tooltip content={<div>Unique key-value pairs containing information about the recording.</div>}>
          <HelpIcon noVerticalAlign />
        </Tooltip>
      }
    >
      <RecordingLabelFields labels={labels} setLabels={setLabels} valid={labelsValid} setValid={setLabelsValid}/>
    </FormGroup>
      </ExpandableSection>
      <ExpandableSection toggleTextExpanded="Hide advanced options" toggleTextCollapsed="Show advanced options">
        <Form>
          <Text component={TextVariants.small}>
            A value of 0 for maximum age or size means unbounded.
          </Text>
          <FormGroup
            fieldId="To Disk"
            helperText="Write contents of buffer onto disk. If disabled, the buffer acts as circular buffer only keeping the most recent recording information"
          >
            <Checkbox
              label="To Disk"
              id="toDisk-checkbox"
              isChecked={toDisk}
              onChange={handleToDiskChange} />
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
                    isDisabled={!toDisk}
                  />
                </SplitItem>
                <SplitItem>
                  <FormSelect
                    value={maxSizeUnits}
                    onChange={handleMaxSizeUnitChange}
                    aria-label="Max size units input"
                    isDisabled={!toDisk}
                  >
                    <FormSelectOption key="1" value="1" label="B" />
                    <FormSelectOption key="2" value={1024} label="KiB" />
                    <FormSelectOption key="3" value={1024*1024} label="MiB" />
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
                  isDisabled={!continuous || !toDisk}
                />
              </SplitItem>
              <SplitItem>
                <FormSelect
                  value={maxAgeUnits}
                  onChange={handleMaxAgeUnitChange}
                  aria-label="Max Age units Input"
                  isDisabled={!continuous || !toDisk}
                >
                  <FormSelectOption key="1" value="1" label="Seconds" />
                  <FormSelectOption key="2" value={60} label="Minutes" />
                  <FormSelectOption key="3" value={60*60} label="Hours" />
                </FormSelect>
              </SplitItem>
            </Split>
          </FormGroup>
        </Form>
      </ExpandableSection>
      <ActionGroup>
        <Button variant="primary" onClick={handleSubmit} isDisabled={nameValid !== ValidatedOptions.success || !template || !templateType || labelsValid !== ValidatedOptions.success}>Create</Button>
        <Button variant="secondary" onClick={history.goBack}>Cancel</Button>
      </ActionGroup>
    </Form>
  </>);
}
