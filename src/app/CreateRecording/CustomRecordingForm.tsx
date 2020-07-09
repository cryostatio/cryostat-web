/*
 * Copyright (c) 2020 Red Hat, Inc.
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
import { ActionGroup, Button, Checkbox, Form, FormGroup, FormSelect, FormSelectOption, FormSelectOptionGroup, Split, SplitItem, Text, TextArea, TextInput, TextVariants, Tooltip, TooltipPosition, ValidatedOptions } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useHistory } from 'react-router-dom';
import { filter, map } from 'rxjs/operators';
import { EventTemplate } from './CreateRecording';

export interface CustomRecordingFormProps {
  onSubmit: (command: string, args: string[]) => void;
}

export const RecordingNamePattern = /^[\w_]+$/;
export const TemplatePattern = /^template=([\w]+)$/;
export const EventSpecifierPattern = /([\w\\.$]+):([\w]+)=([\w\d\\.]+)/;

export const CustomRecordingForm = (props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const history = useHistory();

  const [recordingName, setRecordingName] = React.useState(props.recordingName || props?.location?.state?.recordingName || '');
  const [nameValid, setNameValid] = React.useState(ValidatedOptions.default);
  const [continuous, setContinuous] = React.useState(false);
  const [duration, setDuration] = React.useState(30);
  const [durationUnit, setDurationUnit] = React.useState(1);
  const [templates, setTemplates] = React.useState([] as EventTemplate[]);
  const [template, setTemplate] = React.useState(props.template || props?.location?.state?.template ||  '');
  const [eventSpecifiers, setEventSpecifiers] = React.useState(props?.eventSpecifiers?.join(' ') || '');
  const [eventsValid, setEventsValid] = React.useState((!!props.template || !!props?.location?.state?.template) ? ValidatedOptions.success : ValidatedOptions.default);

  const handleContinuousChange = (checked, evt) => {
    setContinuous(evt.target.checked);
  };

  const handleDurationChange = (evt) => {
    setDuration(Number(evt));
  };

  const handleDurationUnitChange = (evt) => {
    setDurationUnit(Number(evt));
  };

  const handleTemplateChange = (name) => {
    setEventsValid(name ? ValidatedOptions.success : ValidatedOptions.error);
    setEventSpecifiers('');
    setTemplate(name);
  };

  const handleEventSpecifiersChange = (evt) => {
    setEventsValid((TemplatePattern.test(evt) || EventSpecifierPattern.test(evt)) ? ValidatedOptions.success : ValidatedOptions.error);
    setTemplate('');
    setEventSpecifiers(evt);
  };

  const getEventSpecifiers = () => template ? `template=${template}` : eventSpecifiers;

  const getEventString = () => template ? `template=${template}` : eventSpecifiers.split(/\s+/).filter(Boolean).join(',');

  const handleRecordingNameChange = (name) => {
    setNameValid(RecordingNamePattern.test(name) ? ValidatedOptions.success : ValidatedOptions.error);
    setRecordingName(name);
  };

  const handleSubmit = () => {
    const eventString = getEventString();

    const notificationMessages: string[] = [];
    if (nameValid !== ValidatedOptions.success) {
      notificationMessages.push(`Recording name ${recordingName} is invalid`);
    }
    if (eventsValid !== ValidatedOptions.success) {
      notificationMessages.push(`Event specifiers are invalid`);
    }
    if (notificationMessages.length > 0) {
      const message = notificationMessages.join('. ').trim() + '.';
      notifications.warning('Invalid form data', message);
      return;
    }

    const command = continuous ? 'start' : 'dump';
    const args = [recordingName];
    if (!continuous) {
      const eventDuration = continuous ? 0 : duration * durationUnit;
      args.push(String(eventDuration));
    }
    args.push(eventString);
    props.onSubmit(command, args);
  };

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list-event-templates')
      .pipe(
        filter(m => m.status === 0),
        map(m => m.payload),
      )
      .subscribe(setTemplates);
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useEffect(() => {
    const sub = context.commandChannel.target().subscribe(target =>
      context.commandChannel.sendMessage('list-event-templates')
    );
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useEffect(() => {
    if (TemplatePattern.test(eventSpecifiers)) {
      const regexMatches = TemplatePattern.exec(eventSpecifiers);
      if (!regexMatches || !regexMatches[1]) {
        return;
      }
      const template = regexMatches[1];
      if (templates.find(t => t.name === template)) {
        handleTemplateChange(template);
      }
    }
  }, [eventSpecifiers, templates]);

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
        helperText="Please enter a recording name. This will be unique within the target JVM."
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
      >
        <Checkbox
          label="Continuous"
          isChecked={continuous}
          onChange={handleContinuousChange}
          aria-label="Continuous checkbox"
          id="recording-continuous"
          name="recording-continuous"
        />
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <TextInput
              value={duration}
              isRequired
              type="number"
              id="recording-duration"
              aria-describedby="recording-duration-helper"
              onChange={handleDurationChange}
              isDisabled={continuous}
              min="0"
            />
          </SplitItem>
          <SplitItem>
            <FormSelect
              value={durationUnit}
              onChange={handleDurationUnitChange}
              aria-label="Duration Units Input"
              isDisabled={continuous}
            >
              <FormSelectOption key="1" value="1" label="Seconds" />
              <FormSelectOption key="2" value={60} label="Minutes" />
              <FormSelectOption key="3" value={60*60}label="Hours" />
            </FormSelect>
          </SplitItem>
        </Split>
      </FormGroup>
      <FormGroup
        label="Events"
        isRequired
        fieldId="recording-events"
        validated={eventsValid}
        helperText="Select a template from the dropdown, or enter a template name or event specifier string in the text area."
      >
        <Split hasGutter={true}>
          <SplitItem>
            <FormSelect
              value={template}
              onChange={handleTemplateChange}
              aria-label="Event Template Input"
            >
              <FormSelectOption key="0" value="" label="Custom Event Definition" />
              <FormSelectOptionGroup key="1" label="Remote Templates">
                {
                  templates.map((t: EventTemplate, idx: number) => (<FormSelectOption key={idx+2} value={t.name} label={t.name} />))
                }
              </FormSelectOptionGroup>
            </FormSelect>
          </SplitItem>
          <SplitItem>
            <Tooltip
              isContentLeftAligned
              position={TooltipPosition.auto}
              content={
                <Text component={TextVariants.p}>
                  Templates are selected with the syntax <i>template=Foo</i>.<br /><br />

                  Event names and options are specified with the syntax <i>ns.Event:option=Value</i>
                  &mdash; ex. <i>jdk.SocketRead:enabled=true</i>.<br /><br />

                Multiple event option specifiers should be separated by whitespace.
                </Text>
              }
            >
              <OutlinedQuestionCircleIcon />
            </Tooltip>
          </SplitItem>
          <SplitItem isFilled>
            <TextArea value={getEventSpecifiers()} onChange={handleEventSpecifiersChange} aria-label="Custom Event Specifiers Area" validated={eventsValid} />
          </SplitItem>
        </Split>
      </FormGroup>
      <ActionGroup>
        <Button variant="primary" onClick={handleSubmit}>Create</Button>
        <Button variant="secondary" onClick={history.goBack}>Cancel</Button>
      </ActionGroup>
    </Form>
  </>);
}
