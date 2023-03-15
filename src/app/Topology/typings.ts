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
