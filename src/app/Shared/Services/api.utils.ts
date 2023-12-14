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

import { AlertVariant } from '@patternfly/react-core';
import {
  ActiveRecording,
  EnvironmentNode,
  EventType,
  GenerationError,
  HttpError,
  NodeType,
  NotificationCategory,
  NotificationMessageMapper,
  Recording,
  Target,
  TargetDiscoveryEvent,
  TargetNode,
  XMLHttpError,
} from './api.types';

// ======================================
// Common utils
// ======================================
export const isHttpError = (err: unknown): err is HttpError => {
  if (!(err instanceof Error)) {
    return false;
  }
  return (err as HttpError).httpResponse !== undefined;
};

export const isXMLHttpError = (err: unknown): err is XMLHttpError => {
  if (!(err instanceof Error)) {
    return false;
  }
  return (err as XMLHttpError).xmlHttpResponse !== undefined;
};

export const isHttpOk = (statusCode: number) => {
  return statusCode >= 200 && statusCode < 300;
};

// ======================================
// Recording utils
// ======================================
export const isActiveRecording = (toCheck: Recording): toCheck is ActiveRecording => {
  return (toCheck as ActiveRecording).state !== undefined;
};

/* eslint @typescript-eslint/no-explicit-any: 0 */
export const isGraphQLAuthError = (resp: any): boolean => {
  if (resp.errors !== undefined) {
    if (resp.errors[0].message.includes('Authentication failed!')) {
      return true;
    }
  }
  return false;
};

// ======================================
// Template utils
// ======================================
export const getCategoryString = (eventType: EventType): string => {
  return eventType.category.join(', ').trim();
};

// ======================================
// Report utils
// ======================================

export const isGenerationError = (err: unknown): err is GenerationError => {
  if ((err as GenerationError).name === undefined) {
    return false;
  }
  if ((err as GenerationError).message === undefined) {
    return false;
  }
  if ((err as GenerationError).messageDetail === undefined) {
    return false;
  }
  if ((err as GenerationError).status === undefined) {
    return false;
  }
  return true;
};

export const isQuotaExceededError = (err: unknown): err is DOMException => {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' ||
      // Firefox
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
};

// ======================================
// Discovery utils
// ======================================
export const DEFAULT_EMPTY_UNIVERSE: EnvironmentNode = {
  id: 0,
  name: 'Universe',
  nodeType: NodeType.UNIVERSE,
  labels: {},
  children: [],
};

export const includesTarget = (arr: Target[], target: Target): boolean => {
  return arr.some((t) => t.connectUrl === target.connectUrl);
};

export const isEqualTarget = (a?: Target, b?: Target): boolean => {
  return a?.connectUrl === b?.connectUrl;
};

export const indexOfTarget = (arr: Target[], target: Target): number => {
  let index = -1;
  arr.forEach((t, idx) => {
    if (t.connectUrl === target.connectUrl) {
      index = idx;
    }
  });
  return index;
};

export const getTargetRepresentation = (t: Target) =>
  !t.alias || t.alias === t.connectUrl ? `${t.connectUrl}` : `${t.alias} (${t.connectUrl})`;

export const isTargetAgentHttp = (t: Target) => t.connectUrl.startsWith('http');

export const isTargetNode = (node: EnvironmentNode | TargetNode): node is TargetNode => {
  return node['target'] !== undefined && node['children'] === undefined;
};

export const getAllLeaves = (root: EnvironmentNode | TargetNode): TargetNode[] => {
  if (isTargetNode(root)) {
    return [root];
  }
  const INIT: TargetNode[] = [];
  return root.children.reduce((prev, curr) => prev.concat(getAllLeaves(curr)), INIT);
};

export const flattenTree = (
  node: EnvironmentNode | TargetNode,
  includeUniverse?: boolean,
): (EnvironmentNode | TargetNode)[] => {
  if (isTargetNode(node)) {
    return [node];
  }

  const INIT: (EnvironmentNode | TargetNode)[] = [];
  const allChildren = node.children.reduce((prev, curr) => prev.concat(flattenTree(curr)), INIT);

  if (node.nodeType === NodeType.UNIVERSE && !includeUniverse) {
    return [...allChildren];
  }

  return [node, ...allChildren];
};

export const getUniqueNodeTypes = (nodes: (EnvironmentNode | TargetNode)[]): NodeType[] => {
  return Array.from(new Set(nodes.map((n) => n.nodeType)));
};

export const getUniqueGroupId = (group: EnvironmentNode) => {
  return `${group.id}`;
};

export const getUniqueTargetId = (target: TargetNode) => {
  return `${target.id}`;
};

// ======================================
// Notifications utils
// ======================================

export const messageKeys = new Map([
  [
    // explicitly configure this category with a null message body mapper.
    // This is a special case because this is generated client-side,
    // not sent by the backend
    NotificationCategory.GrafanaConfiguration,
    {
      title: 'Grafana Configuration',
    },
  ],
  [
    NotificationCategory.LayoutTemplateCreated,
    {
      title: 'Layout Template Created',
    },
  ],
  [
    NotificationCategory.TargetJvmDiscovery,
    {
      variant: AlertVariant.info,
      title: 'Target JVM Discovery',
      body: (v) => {
        const evt: TargetDiscoveryEvent = v.message.event;
        const target: Target = evt.serviceRef;
        switch (evt.kind) {
          case 'FOUND':
            return `Target "${target.alias}" appeared (${target.connectUrl})"`;
          case 'LOST':
            return `Target "${target.alias}" disappeared (${target.connectUrl})"`;
          case 'MODIFIED':
            return `Target "${target.alias}" was modified (${target.connectUrl})"`;
          default:
            return `Received a notification with category ${NotificationCategory.TargetJvmDiscovery} and unrecognized kind ${evt.kind}`;
        }
      },
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.WsClientActivity,
    {
      variant: AlertVariant.info,
      title: 'WebSocket Client Activity',
      body: (evt) => {
        const addr = Object.keys(evt.message)[0];
        const status = evt.message[addr];
        return `Client at ${addr} ${status}`;
      },
      hidden: true,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ActiveRecordingCreated,
    {
      variant: AlertVariant.success,
      title: 'Recording Created',
      body: (evt) => `${evt.message.recording.name} created in target: ${evt.message.target}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ActiveRecordingStopped,
    {
      variant: AlertVariant.success,
      title: 'Recording Stopped',
      body: (evt) => `${evt.message.recording.name} was stopped`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ActiveRecordingSaved,
    {
      variant: AlertVariant.success,
      title: 'Recording Saved',
      body: (evt) => `${evt.message.recording.name} was archived`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ActiveRecordingDeleted,
    {
      variant: AlertVariant.success,
      title: 'Recording Deleted',
      body: (evt) => `${evt.message.recording.name} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.SnapshotCreated,
    {
      variant: AlertVariant.success,
      title: 'Snapshot Created',
      body: (evt) => `${evt.message.recording.name} was created in target: ${evt.message.target}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.SnapshotDeleted,
    {
      variant: AlertVariant.success,
      title: 'Snapshot Deleted',
      body: (evt) => `${evt.message.recording.name} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ArchivedRecordingCreated,
    {
      variant: AlertVariant.success,
      title: 'Archived Recording Uploaded',
      body: (evt) => `${evt.message.recording.name} was uploaded into archives`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ArchivedRecordingDeleted,
    {
      variant: AlertVariant.success,
      title: 'Archived Recording Deleted',
      body: (evt) => `${evt.message.recording.name} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.TemplateUploaded,
    {
      variant: AlertVariant.success,
      title: 'Template Created',
      body: (evt) => `${evt.message.template.name} was created`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ProbeTemplateUploaded,
    {
      variant: AlertVariant.success,
      title: 'Probe Template Created',
      body: (evt) => `${evt.message.probeTemplate} was created`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ProbeTemplateApplied,
    {
      variant: AlertVariant.success,
      title: 'Probe Template Applied',
      body: (evt) => `${evt.message.probeTemplate} was inserted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.TemplateDeleted,
    {
      variant: AlertVariant.success,
      title: 'Template Deleted',
      body: (evt) => `${evt.message.template.name} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ProbeTemplateDeleted,
    {
      variant: AlertVariant.success,
      title: 'Probe Template Deleted',
      body: (evt) => `${evt.message.probeTemplate} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.ProbesRemoved,
    {
      variant: AlertVariant.success,
      title: 'Probes Removed from Target',
      body: (evt) => `Probes successfully removed from ${evt.message.target}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.RuleCreated,
    {
      variant: AlertVariant.success,
      title: 'Automated Rule Created',
      body: (evt) => `${evt.message.name} was created`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.RuleUpdated,
    {
      variant: AlertVariant.success,
      title: 'Automated Rule Updated',
      body: (evt) => `${evt.message.name} was ` + (evt.message.enabled ? 'enabled' : 'disabled'),
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.RuleDeleted,
    {
      variant: AlertVariant.success,
      title: 'Automated Rule Deleted',
      body: (evt) => `${evt.message.name} was deleted`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.RecordingMetadataUpdated,
    {
      variant: AlertVariant.success,
      title: 'Recording Metadata Updated',
      body: (evt) => `${evt.message.recordingName} metadata was updated`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.TargetCredentialsStored,
    {
      variant: AlertVariant.success,
      title: 'Target Credentials Stored',
      body: (evt) => `Credentials stored for target: ${evt.message.target}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.TargetCredentialsDeleted,
    {
      variant: AlertVariant.success,
      title: 'Target Credentials Deleted',
      body: (evt) => `Credentials deleted for target: ${evt.message.target}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.CredentialsStored,
    {
      variant: AlertVariant.success,
      title: 'Credentials Stored',
      body: (evt) => `Credentials stored for: ${evt.message.matchExpression}`,
    } as NotificationMessageMapper,
  ],
  [
    NotificationCategory.CredentialsDeleted,
    {
      variant: AlertVariant.success,
      title: 'Credentials Deleted',
      body: (evt) => `Credentials deleted for: ${evt.message.matchExpression}`,
    } as NotificationMessageMapper,
  ],
]);
