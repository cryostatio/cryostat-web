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
import { Card, Checkbox, CardBody, CardHeader, FormSelect, FormSelectOption, Split, SplitItem, Text, TextInput, TextVariants } from '@patternfly/react-core';
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { ServiceContext } from '@app/Shared/Services/Services';

export interface SettingsProps { }

export const Settings: React.FunctionComponent<SettingsProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [state, setState] = React.useState(defaultPreferences);

  React.useLayoutEffect(() => {
    setState({
      autoRefreshEnabled: context.settings.autoRefreshEnabled(),
      autoRefreshPeriod: context.settings.autoRefreshPeriod(),
      autoRefreshUnits: context.settings.autoRefreshUnits(),
    });
  }, [context.settings]);

  const handleAutoRefreshPeriodChange = React.useCallback(autoRefreshPeriod => {
    setState(state => ({ ...state, autoRefreshPeriod }));
    context.settings.setAutoRefreshPeriod(autoRefreshPeriod);
  }, [context.settings]);

  const handleAutoRefreshUnitChange = React.useCallback(autoRefreshUnits => {
    setState(state => ({ ...state, autoRefreshUnits }));
    context.settings.setAutoRefreshUnits(autoRefreshUnits);
  }, [context.settings]);

  const handleAutoRefreshEnabledChange = React.useCallback(autoRefreshEnabled => {
    setState(state => ({ ...state, autoRefreshEnabled }));
    context.settings.setAutoRefreshEnabled(autoRefreshEnabled);
  }, [context.settings]);

  return (<>
    <BreadcrumbPage pageTitle="Settings">
      <Card>
        <CardHeader>
          <Text component={TextVariants.h4}>
            Auto-Refresh
          </Text>
        </CardHeader>
        <CardBody>
          <Text component={TextVariants.p}>
            Set the refresh period for content views.
          </Text>
          <Split hasGutter={true}>
            <SplitItem isFilled>
              <TextInput
                value={state.autoRefreshPeriod}
                isRequired
                type="number"
                id="auto-refresh-period"
                onChange={handleAutoRefreshPeriodChange}
                isDisabled={!state.autoRefreshEnabled}
                min="0"
              />
            </SplitItem>
            <SplitItem>
              <FormSelect
                value={state.autoRefreshUnits}
                onChange={handleAutoRefreshUnitChange}
                aria-label="Auto Refresh Units Input"
                isDisabled={!state.autoRefreshEnabled}
              >
                <FormSelectOption key="1" value={1*1000} label="Seconds" />
                <FormSelectOption key="2" value={60*1000} label="Minutes" />
                <FormSelectOption key="3" value={60*60*1000} label="Hours" />
              </FormSelect>
            </SplitItem>
          </Split>
          <Checkbox id="auto-refresh-enabled" label="Enabled" isChecked={state.autoRefreshEnabled} onChange={handleAutoRefreshEnabledChange} />
        </CardBody>
      </Card>
    </BreadcrumbPage>
  </>);

}

export interface UserPreferences {
  autoRefreshEnabled: boolean;
  autoRefreshPeriod: number;
  autoRefreshUnits: number;
}

const defaultPreferences: UserPreferences = {
  autoRefreshEnabled: true,
  autoRefreshPeriod: 30,
  autoRefreshUnits: 1,
}
