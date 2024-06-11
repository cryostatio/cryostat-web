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

import { JmxAuthDescription } from '@app/Shared/Components/JmxAuthDescription';
import { JmxSslDescription } from '@app/Shared/Components/JmxSslDescription';
import { TopologyFilters } from '@app/Shared/Redux/Filters/TopologyFilterSlice';
import { NodeType, EnvironmentNode, TargetNode } from '@app/Shared/Services/api.types';
import { DEFAULT_EMPTY_UNIVERSE, isTargetNode } from '@app/Shared/Services/api.utils';
import {
  Button,
  Text,
  TextVariants,
  DescriptionListTermHelpText,
  DescriptionListTermHelpTextButton,
  Popover,
} from '@patternfly/react-core';
import { NodeStatus } from '@patternfly/react-topology';
import * as React from 'react';
import { WarningResolverAsCredModal, WarningResolverAsLink } from '../Actions/WarningResolver';
import { GraphElement, ListElement, StatusExtra } from './types';

export const TOPOLOGY_GRAPH_ID = 'cryostat-target-topology-graph';

export const DiscoveryTreeContext = React.createContext(DEFAULT_EMPTY_UNIVERSE);

export const COLLAPSE_EXEMPTS = [NodeType.NAMESPACE, NodeType.REALM, NodeType.UNIVERSE];

export const nodeTypeToAbbr = (type: NodeType = NodeType.NODE): string => {
  // Keep uppercases (or uppercase whole word if none) and retain first 4 charaters.
  return (type.replace(/[^A-Z]/g, '') || type.toUpperCase()).slice(0, 4);
};

export const getStatusTargetNode = (node: TargetNode | EnvironmentNode): [NodeStatus?, StatusExtra?] => {
  if (isTargetNode(node)) {
    return node.target.jvmId
      ? []
      : [
          NodeStatus.warning,
          {
            title: 'Failed to generate the JVM identifier',
            description: (
              <>
                <Text component={TextVariants.p}>Check the target authentication settings:</Text>
              </>
            ),
            callForAction: [
              <Text key="jmx-auth" component={TextVariants.p}>
                If{' '}
                <DescriptionListTermHelpText>
                  <Popover maxWidth="40rem" headerContent="JMX Authentication" bodyContent={<JmxAuthDescription />}>
                    <DescriptionListTermHelpTextButton>JMX Authentication</DescriptionListTermHelpTextButton>
                  </Popover>
                </DescriptionListTermHelpText>{' '}
                is enabled,{' '}
                <WarningResolverAsCredModal key={`${node.target.alias}-resolver-as-credential-modal`}>
                  <Button variant="link" isSmall style={{ padding: 0 }}>
                    add credentials
                  </Button>
                  .
                </WarningResolverAsCredModal>
              </Text>,
              <Text key="jmx-ssl" component={TextVariants.p}>
                If{' '}
                <DescriptionListTermHelpText>
                  <Popover maxWidth="40rem" headerContent="JMX over SSL/TLS" bodyContent={<JmxSslDescription />}>
                    <DescriptionListTermHelpTextButton>SSL/TLS is enabled</DescriptionListTermHelpTextButton>
                  </Popover>
                </DescriptionListTermHelpText>{' '}
                for JMX,{' '}
                <WarningResolverAsLink key={`${node.target.alias}-resolver-as-link-to-security`} to="/security">
                  check if the SSL/TLS certificate is loaded.
                </WarningResolverAsLink>
                .
              </Text>,
            ],
          },
        ];
  }
  return [];
};

export const isGraphElement = (element: GraphElement | ListElement): element is GraphElement => {
  return (element as GraphElement).getGraph !== undefined;
};

// For searching
export const isGroupNodeFiltered = (
  groupNode: EnvironmentNode,
  filters?: TopologyFilters['groupFilters']['filters'],
) => {
  if (!filters || !filters[groupNode.nodeType]) {
    return true;
  }
  const filter = filters[groupNode.nodeType];
  let matched = true;
  if (filter.Name && filter.Name.length) {
    matched = matched && filter.Name.includes(groupNode.name);
  }
  if (filter.Label && filter.Label.length) {
    matched =
      matched && Object.entries(groupNode.labels).filter(([k, v]) => filter.Label.includes(`${k}=${v}`)).length > 0;
  }
  return matched;
};

export const isTargetNodeFiltered = ({ target }: TargetNode, filters?: TopologyFilters['targetFilters']['filters']) => {
  if (!filters) {
    return true;
  }
  let matched = true;
  if (filters.Alias && filters.Alias.length) {
    matched = matched && filters.Alias.includes(target.alias);
  }
  if (filters.ConnectionUrl && filters.ConnectionUrl.length) {
    matched = matched && filters.ConnectionUrl.includes(target.connectUrl);
  }
  if (filters.JvmId && filters.JvmId.length) {
    matched = matched && target.jvmId !== undefined && filters.JvmId.includes(target.jvmId);
  }
  if (filters.Label && filters.Label.length) {
    matched =
      matched && Object.entries(target.labels || {}).filter(([k, v]) => filters.Label.includes(`${k}=${v}`)).length > 0;
  }
  if (filters.Annotation && filters.Annotation.length) {
    const annotations = target.annotations;
    matched =
      matched &&
      [...Object.entries(annotations?.cryostat || {}), ...Object.entries(annotations?.platform || {})].filter(
        ([k, v]) => filters.Annotation.includes(`${k}=${v}`),
      ).length > 0;
  }
  return matched;
};
