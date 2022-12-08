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
import { Stack, StackItem } from '@patternfly/react-core';
import { TargetView } from '@app/TargetView/TargetView';
import { AddCard } from './AddCard';
import { AutomatedAnalysisCard } from './AutomatedAnalysis/AutomatedAnalysisCard';

export interface CardConfig {
  component: string;
  props?: React.PropsWithChildren<any>;
}

export interface DashboardProps {}

export const DashboardCards = [AutomatedAnalysisCard];

function getComponentByName(name: String) {
  for (const choice of DashboardCards) {
    if (choice.name === name) {
      return choice;
    }
  }
  throw new Error(`Unknown card type selection: ${name}`);
}

export const Dashboard: React.FunctionComponent<DashboardProps> = (props) => {
  const [contentConfigs, setContentConfigs] = React.useState([] as CardConfig[]);

  const handleAdd = React.useCallback(
    (cfg) => {
      setContentConfigs((old) => [cfg, ...old]);
    },
    [setContentConfigs]
  );

  return (
    <TargetView pageTitle="Dashboard" compactSelect={false} hideEmptyState>
      <Stack hasGutter>
        {contentConfigs.map((cfg, idx) => (
          <StackItem key={idx}>{React.createElement(getComponentByName(cfg.component), cfg.props)}</StackItem>
        ))}
        <StackItem key={contentConfigs.length}>
          <AddCard onAdd={handleAdd} />
        </StackItem>
      </Stack>
    </TargetView>
  );
};

export default Dashboard;
