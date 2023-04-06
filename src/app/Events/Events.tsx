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
import { getActiveTab, switchTab } from '@app/utils/utils';
import { Card, CardBody, Stack, StackItem, Tab, Tabs, Tooltip } from '@patternfly/react-core';
import * as React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { concatMap, filter } from 'rxjs';
import { EventTemplates } from './EventTemplates';
import { EventTypes } from './EventTypes';

export interface EventsProps {}

export const Events: React.FC<EventsProps> = ({ ...props }) => {
  return (
    <TargetView {...props} pageTitle="Events">
      <Stack hasGutter>
        <StackItem>
          <Card>
            <CardBody>
              <EventTabs />
            </CardBody>
          </Card>
        </StackItem>
        <StackItem>
          <Card>
            <CardBody>
              <AgentTabs />
            </CardBody>
          </Card>
        </StackItem>
      </Stack>
    </TargetView>
  );
};

enum EventTab {
  EVENT_TEMPLATE = 'event-template',
  EVENT_TYPE = 'event-type',
}

export const EventTabs: React.FC = () => {
  const { search, pathname } = useLocation();
  const history = useHistory();

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, 'eventTab', Object.values(EventTab), EventTab.EVENT_TEMPLATE);
  }, [search]);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(history, pathname, search, { tabKey: 'eventTab', tabValue: `${key}` }),
    [history, pathname, search]
  );

  return (
    <Tabs activeKey={activeTab} onSelect={onTabSelect}>
      <Tab eventKey={EventTab.EVENT_TEMPLATE} title="Event Templates">
        <EventTemplates />
      </Tab>
      <Tab eventKey={EventTab.EVENT_TYPE} title="Event Types">
        <EventTypes />
      </Tab>
    </Tabs>
  );
};

enum AgentTab {
  AGENT_TEMPLATE = 'agent-template',
  AGENT_PROBE = 'agent-probe',
}

export const AgentTabs: React.FC = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const { search, pathname } = useLocation();
  const history = useHistory();

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, 'agentTab', Object.values(AgentTab), AgentTab.AGENT_TEMPLATE);
  }, [search]);

  const [agentDetected, setAgentDetected] = React.useState(false);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(history, pathname, search, { tabKey: 'agentTab', tabValue: `${key}` }),
    [history, pathname, search]
  );

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

  return (
    <Tabs activeKey={activeTab} onSelect={onTabSelect}>
      <Tab eventKey={AgentTab.AGENT_TEMPLATE} title="Probe Templates">
        <AgentProbeTemplates agentDetected={agentDetected} />
      </Tab>
      <Tab
        eventKey={AgentTab.AGENT_PROBE}
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
  );
};
export default Events;
