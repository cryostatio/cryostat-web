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
import { Target } from '@app/Shared/Services/Target.service';

export enum NodeType {
  // The entire deployment scenario Cryostat finds itself in.
  UNIVERSE = 'Universe',
  // A division of the deployment scenario (i.e. Kubernetes, JDP, Custom Target, CryostatAgent)
  REALM = 'Realm',
  // A plain target JVM, connectable over JMX.
  JVM = 'JVM',
  // A target JVM using the Cryostat Agent, *not* connectable over JMX. Agent instances
  // that do publish a JMX Service URL should publish themselves with the JVM NodeType.
  AGENT = 'CryostatAgent',
  // Custom target defined via Custom Target Creation Form.
  CUSTOM_TARGET = 'CustomTarget',
  // Kubernetes platform.
  NAMESPACE = 'Namespace',
  STATEFULSET = 'StatefulSet',
  DAEMONSET = 'DaemonSet',
  DEPLOYMENT = 'Deployment',
  DEPLOYMENTCONFIG = 'DeploymentConfig', // OpenShift specific
  REPLICASET = 'ReplicaSet',
  REPLICATIONCONTROLLER = 'ReplicationController',
  POD = 'Pod',
  ENDPOINT = 'Endpoint',
  // Standalone targets
  TARGET = 'Target',
}

export interface NodeLabels {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly [key: string]: any;
}

interface _AbstractNode {
  readonly id: number;
  readonly name: string;
  readonly nodeType: NodeType;
  readonly labels: NodeLabels;
}

export interface EnvironmentNode extends _AbstractNode {
  readonly children: (EnvironmentNode | TargetNode)[];
}

export interface TargetNode extends _AbstractNode {
  readonly target: Target;
}

export const DEFAULT_EMPTY_UNIVERSE: EnvironmentNode = {
  id: 0,
  name: 'Universe',
  nodeType: NodeType.UNIVERSE,
  labels: {},
  children: [],
};

export const isTargetNode = (node: EnvironmentNode | TargetNode): node is TargetNode => {
  return node['target'] !== undefined && node['children'] === undefined;
};
