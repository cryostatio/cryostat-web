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
import { AgentLiveProbes } from '@app/Agent/AgentLiveProbes';
import { AgentProbeTemplates } from '@app/Agent/AgentProbeTemplates';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Card, CardBody, Stack, StackItem, Tab, Tabs, Tooltip } from '@patternfly/react-core';
import * as React from 'react';
import { StaticContext } from 'react-router';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { concatMap, filter } from 'rxjs';
import { EventTemplates } from './EventTemplates';
import { EventTypes } from './EventTypes';

export type SupportedEventTab = 'templates' | 'types';

export type SupportedAgentTab = 'templates' | 'probes';

export interface EventsProps {
  eventTab?: SupportedEventTab;
  agentTab?: SupportedAgentTab;
}

export const Events: React.FC<RouteComponentProps<Record<string, never>, StaticContext, EventsProps>> = ({
  location,
  ...props
}) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [eventActiveTab, setEventActiveTab] = React.useState(location?.state?.eventTab || 'templates');
  const [probeActiveTab, setProbeActiveTab] = React.useState(location?.state?.agentTab || 'templates');
  const [agentDetected, setAgentDetected] = React.useState(false);

  React.useEffect(() => {
    addSubscription(
      context.target
        .target()
        .pipe(
          filter((target) => target !== NO_TARGET),
          concatMap((_) => context.api.isProbeEnabled())
        )
        .subscribe(setAgentDetected)
    );
  }, [addSubscription, context.target, context.api, setAgentDetected]);

  const handleEventTabSelect = React.useCallback(
    (evt, key: string | number) => setEventActiveTab(`${key}` as SupportedEventTab),
    [setEventActiveTab]
  );

  const handleProbeTabSelect = React.useCallback(
    (evt, key: string | number) => setProbeActiveTab(`${key}` as SupportedAgentTab),
    [setProbeActiveTab]
  );

  return (
    <>
      <TargetView pageTitle="Events">
        <Stack hasGutter>
          <StackItem>
            <Card>
              <CardBody>
                <Tabs activeKey={eventActiveTab} onSelect={handleEventTabSelect}>
                  <Tab eventKey={'templates'} title="Event Templates">
                    <EventTemplates />
                  </Tab>
                  <Tab eventKey={'types'} title="Event Types">
                    <EventTypes />
                  </Tab>
                </Tabs>
              </CardBody>
            </Card>
          </StackItem>
          <StackItem>
            <Card>
              <CardBody>
                <Tabs activeKey={probeActiveTab} onSelect={handleProbeTabSelect}>
                  <Tab eventKey={'templates'} title="Probe Templates">
                    <AgentProbeTemplates agentDetected={agentDetected} />
                  </Tab>
                  <Tab
                    eventKey={'probes'}
                    title="Live Configuration"
                    isAriaDisabled={!agentDetected}
                    tooltip={
                      agentDetected ? undefined : (
                        <Tooltip content="JMC ByteCode Instrumentation Agent not detected for the selected Target JVM" />
                      )
                    }
                  >
                    <AgentLiveProbes />
                  </Tab>
                </Tabs>
              </CardBody>
            </Card>
          </StackItem>
        </Stack>
      </TargetView>
    </>
  );
};

export default withRouter(Events);
