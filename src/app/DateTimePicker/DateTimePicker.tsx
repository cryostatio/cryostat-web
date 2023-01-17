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
 * * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { TimePicker } from '@app/DateTimePicker/TimePicker';
import {
  ActionGroup,
  Bullseye,
  Button,
  CalendarMonth,
  CalendarMonthInlineProps,
  Form,
  FormGroup,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import React from 'react';

export interface DateTimePickerProps {
  onSelect: (date: Date) => void;
  onDismiss: () => void;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ onSelect, onDismiss }) => {
  const [activeTab, setActiveTab] = React.useState('date');

  const inlineProps: CalendarMonthInlineProps = React.useMemo(
    () => ({
      component: 'article',
      ariaLabelledby: 'start-date',
    }),
    []
  );

  const handleTabSelect = React.useCallback((_, key: string | number) => setActiveTab(`${key}`), [setActiveTab]);

  const handleSelect = React.useCallback(() => {}, []); // TODO: Handle select

  return (
    <Form>
      <Tabs // TODO: Show currently selected datetime in form
        aria-label="Select a date or time tab"
        onSelect={handleTabSelect}
        activeKey={activeTab}
        isFilled
        role="region"
      >
        <Tab key={'date'} eventKey={'date'} title={<TabTitleText>Date</TabTitleText>}>
          <FormGroup key={'calendar'}>
            <Bullseye>
              <CalendarMonth isDateFocused inlineProps={inlineProps} style={{ padding: 0 }} />
            </Bullseye>
          </FormGroup>
        </Tab>
        <Tab key={'time'} eventKey={'time'} title={<TabTitleText>Time</TabTitleText>}>
          <FormGroup key={'time'}>
            <Bullseye>
              <TimePicker />
            </Bullseye>
          </FormGroup>
        </Tab>
      </Tabs>
      <ActionGroup>
        <Button variant="primary" onClick={handleSelect}>
          Select
        </Button>
        <Button variant="link" onClick={onDismiss}>
          Cancel
        </Button>
      </ActionGroup>
    </Form>
  );
};
