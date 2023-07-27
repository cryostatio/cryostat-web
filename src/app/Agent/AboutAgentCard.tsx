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
import { Card, CardBody, CardTitle } from '@patternfly/react-core';
import * as React from 'react';

export interface AboutAgentCardProps {}

export const AboutAgentCard: React.FC<AboutAgentCardProps> = (_) => {
  return (
    <Card>
      <CardTitle>About the JMC Agent</CardTitle>
      <CardBody>
        The JMC Agent allows users to dynamically inject custom JFR events into running JVMs. In order to make use of
        the JMC Agent, the agent jar must be present in the same container as the target, and the target must be started
        with the agent (-javaagent:/path/to/agent.jar). Once these pre-requisites are met, the user can upload probe
        templates to Cryostat and insert them to the target, as well as view or remove currently active probes.
      </CardBody>
    </Card>
  );
};
