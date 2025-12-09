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
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetContextSelector } from '@app/TargetView/TargetContextSelector';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { getActiveTab, switchTab } from '@app/utils/utils';
import { Card, CardBody, Tab, Tabs, Tooltip } from '@patternfly/react-core';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { concatMap, filter, tap } from 'rxjs';
import { AgentLiveProbes } from './AgentLiveProbes';
import { AgentProbeTemplates } from './AgentProbeTemplates';

export const JMCAgent: React.FC = ({ ...props }) => {
  return (
    <>
      <TargetContextSelector />
      <BreadcrumbPage {...props} pageTitle="Instrumentation">
        <Card>
          <CardBody isFilled>
            <AgentTabs />
          </CardBody>
        </Card>
      </BreadcrumbPage>
    </>
  );
};

enum AgentTab {
  AGENT_TEMPLATE = 'agent-template',
  AGENT_PROBE = 'agent-probe',
}

const AgentTabs: React.FC = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const { search, pathname } = useLocation();
  const navigate = useNavigate();

  const [targetSelected, setTargetSelected] = React.useState(false);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe((t) => setTargetSelected(!!t)));
  }, [addSubscription, context, context.target]);

  const activeTab = React.useMemo(() => {
    return getActiveTab(search, 'agentTab', Object.values(AgentTab), AgentTab.AGENT_TEMPLATE);
  }, [search]);

  const [agentDetected, setAgentDetected] = React.useState(false);

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(navigate, pathname, search, { tabKey: 'agentTab', tabValue: `${key}` }),
    [navigate, pathname, search],
  );

  React.useEffect(() => {
    addSubscription(
      context.target
        .target()
        .pipe(
          tap(() => setAgentDetected(false)),
          filter((target) => !!target),
          concatMap((_) => context.api.isProbeEnabled()),
        )
        .subscribe(setAgentDetected),
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
        isAriaDisabled={!targetSelected || !agentDetected}
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

export default JMCAgent;
