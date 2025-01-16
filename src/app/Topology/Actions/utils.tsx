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

import {
  ActiveRecording,
  EnvironmentNode,
  NotificationMessage,
  NotificationCategory,
  NodeType,
  TargetNode,
} from '@app/Shared/Services/api.types';
import { getAllLeaves, isTargetNode } from '@app/Shared/Services/api.utils';
import { NotificationService } from '@app/Shared/Services/Notifications.service';
import { toPath } from '@app/utils/utils';
import { ContextMenuSeparator } from '@patternfly/react-topology';
import { merge, filter, map, debounceTime } from 'rxjs';
import { getJvmIdFromEvent } from '../Entity/utils';
import { GraphElement, ListElement } from '../Shared/types';
import { ContextMenuItem } from './NodeActions';
import type { ActionUtils, NodeAction, NodeActionKey, GroupActionResponse, MenuItemVariant } from './types';

export const QUICK_RECORDING_NAME = 'cryostat_topology_action';

export const QUICK_RECORDING_LABEL_KEY = 'cryostat.io.topology-group';

export const isQuickRecording = (recording: ActiveRecording) => {
  return recording.name === QUICK_RECORDING_NAME;
};

export const isQuickRecordingExist = (group: EnvironmentNode, { services }: ActionUtils) => {
  const jvmIds = new Set(getAllLeaves(group).map((tn) => tn.target.jvmId));
  const filterFn = (e: NotificationMessage) => {
    const jvmId = getJvmIdFromEvent(e);
    const recording = e.message.recording;
    return jvmId !== undefined && jvmIds.has(jvmId) && isQuickRecording(recording);
  };

  return merge(
    services.api.groupHasRecording(group, { name: QUICK_RECORDING_NAME }),
    services.notificationChannel.messages(NotificationCategory.ActiveRecordingCreated).pipe(
      filter(filterFn),
      map((_) => true),
    ),
    services.notificationChannel.messages(NotificationCategory.ActiveRecordingDeleted).pipe(
      filter(filterFn),
      debounceTime(500),
      map((_) => services.api.groupHasRecording(group, { name: QUICK_RECORDING_NAME })),
    ),
  );
};

export const nodeActions: NodeAction[] = [
  {
    key: 'VIEW_DASHBOARD',
    action: (element, { navigate, services }) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      navigate(toPath('/'));
    },
    title: 'View Dashboard',
  },
  {
    key: 'VIEW_RECORDINGS',
    action: (element, { navigate, services }) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      navigate(toPath('/recordings'));
    },
    title: 'View Recordings',
  },
  { key: '', isSeparator: true },
  {
    key: 'CREATE_RECORDINGS',
    action: (element, { navigate, services }) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      navigate(toPath('/recordings/create'));
    },
    title: 'Create Recordings',
  },
  {
    key: 'CREATE_RULES',
    action: (element, { navigate, services }) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      navigate(toPath('/rules/create'));
    },
    title: 'Create Automated Rules',
  },
  { key: '', isSeparator: true },
  {
    key: 'DELETE_TARGET',
    isDanger: true,
    action: (element, { services }) => {
      const targetNode: TargetNode = element.getData();
      services.api.deleteTarget(targetNode.target).subscribe(() => undefined);
    },
    title: 'Delete target',
    allowed: (element) => {
      const targetNode: TargetNode = element.getData();
      const realm = targetNode.target.annotations.cryostat.find((label) => label.key === 'REALM')?.value;

      return targetNode.nodeType === NodeType.JVM && realm === 'Custom Targets';
    },
  },
  {
    key: 'GROUP_START_RECORDING',
    title: 'Start Recording',
    isGroup: true,
    action: (element, { services, notifications }) => {
      const group: EnvironmentNode = element.getData();
      services.api
        .graphql<GroupActionResponse>(
          `
            query StartRecordingForGroup($filter: DiscoveryNodeFilterInput!, $recordingName: String!, $metadata: RecordingMetadataInput!) {
              environmentNodes(filter: $filter) {
                name
                descendantTargets {
                  name
                  target {
                    doStartRecording(recording: {
                      name: $recordingName,
                      template: "Continuous",
                      templateType: "TARGET",
                      duration: 0,
                      replace: "STOPPED",
                      metadata: $metadata,
                      }) {
                          name
                          state
                    }
                  }
                }
              }
            }
              `,
          {
            filter: { id: group.id },
            recordingName: QUICK_RECORDING_NAME,
            metadata: {
              labels: [{ key: QUICK_RECORDING_LABEL_KEY, value: group.name.replace(/[\s+-]/g, '_') }],
            },
          },
          false,
          true,
        )
        .subscribe((body) => {
          notifyGroupActionErrors('GROUP_START_RECORDING', group, body, notifications);
        });
    },
  },
  {
    key: 'GROUP_ARCHIVE_RECORDING',
    title: 'Archive Recording',
    isGroup: true,
    action: (element, { services, notifications }) => {
      const group: EnvironmentNode = element.getData();
      services.api
        .graphql<GroupActionResponse>(
          `
            query ArchiveRecordingForGroup ($groupFilter: DiscoveryNodeFilterInput, $recordingFilter: ActiveRecordingsFilterInput) {
              environmentNodes(filter: $groupFilter) {
                name
                descendantTargets {
                  name
                  target {
                    recordings {
                      active(filter: $recordingFilter) {
                        data {
                          doArchive {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
          }
              `,
          {
            groupFilter: { id: group.id },
            recordingFilter: { name: QUICK_RECORDING_NAME },
          },
          false,
          true,
        )
        .subscribe((body) => {
          notifyGroupActionErrors('GROUP_ARCHIVE_RECORDING', group, body, notifications);
        });
    },
    isDisabled: (element, utils) => {
      return isQuickRecordingExist(element.getData(), utils).pipe(map((exist) => !exist));
    },
  },
  {
    key: 'GROUP_STOP_RECORDING',
    title: 'Stop Recording',
    isGroup: true,
    action: (element, { services, notifications }) => {
      const group: EnvironmentNode = element.getData();
      services.api
        .graphql<GroupActionResponse>(
          `
            query StopRecordingForGroup ($groupFilter: DiscoveryNodeFilterInput, $recordingFilter: ActiveRecordingsFilterInput) {
              environmentNodes(filter: $groupFilter) {
                name
                descendantTargets {
                  name
                  target {
                    recordings {
                      active(filter: $recordingFilter) {
                        data {
                          doStop {
                            name
                            state
                          }
                        }
                      }
                    }
                  }
                }
              }
          }
              `,
          {
            groupFilter: { id: group.id },
            recordingFilter: { name: QUICK_RECORDING_NAME },
          },
          false,
          true,
        )
        .subscribe((body) => {
          notifyGroupActionErrors('GROUP_STOP_RECORDING', group, body, notifications);
        });
    },
    isDisabled: (element, utils) => {
      return isQuickRecordingExist(element.getData(), utils).pipe(map((exist) => !exist));
    },
  },
  { key: '', isSeparator: true, isGroup: true },
  {
    key: 'GROUP_DELETE_RECORDING',
    title: 'Delete Recording',
    isGroup: true,
    isDanger: true,
    action: (element, { services, notifications }) => {
      const group: EnvironmentNode = element.getData();
      services.api
        .graphql<GroupActionResponse>(
          `
            query DeleteRecordingForGroup ($groupFilter: DiscoveryNodeFilterInput, $recordingFilter: ActiveRecordingsFilterInput) {
              environmentNodes(filter: $groupFilter) {
                name
                descendantTargets {
                  name
                  target {
                    recordings {
                      active(filter: $recordingFilter) {
                        data {
                          doDelete {
                            name
                            state
                          }
                        }
                      }
                    }
                  }
                }
              }
          }
              `,
          {
            groupFilter: { id: group.id },
            recordingFilter: { name: QUICK_RECORDING_NAME },
          },
          false,
          true,
        )
        .subscribe((body) => {
          notifyGroupActionErrors('GROUP_DELETE_RECORDING', group, body, notifications);
        });
    },
    isDisabled: (element, utils) => {
      return isQuickRecordingExist(element.getData(), utils).pipe(map((exist) => !exist));
    },
  },
];

export const notifyGroupActionErrors = (
  type: Extract<
    'GROUP_START_RECORDING' | 'GROUP_ARCHIVE_RECORDING' | 'GROUP_STOP_RECORDING' | 'GROUP_DELETE_RECORDING',
    NodeActionKey
  >,
  group: EnvironmentNode,
  { errors, data }: GroupActionResponse,
  notifications: NotificationService,
): void => {
  if (errors) {
    const actionVerb = type
      .split('_')
      .slice(1)
      .map((str) => str.toLowerCase())
      .join(' ');
    const groupDisplay = `${group.nodeType} ${group.name}`;
    errors.forEach((err) => {
      // Location of failed target node
      const searchIndex = Number(err.path[err.path.indexOf('descendantTargets') + 1]);
      if (searchIndex == undefined) {
        notifications.danger(`Could not ${actionVerb} for a target in ${groupDisplay}`, err.message);
      }

      // Get the name of failed target node
      const name: string | undefined = data.environmentNodes[0]?.descendantTargets[searchIndex]?.name;

      if (name) {
        notifications.danger(`Could not ${actionVerb} for target ${name} in ${groupDisplay}`, err.message);
      } else {
        notifications.danger(`Could not ${actionVerb} for a target in ${groupDisplay}`, err.message);
      }
    });
  }
};

export const actionFactory = (
  element: GraphElement | ListElement,
  variant: MenuItemVariant = 'contextMenuItem',
  actionFilter = (_: NodeAction) => true,
) => {
  const data: TargetNode = element.getData();
  const isGroup = !isTargetNode(data);
  let filtered = nodeActions.filter((action) => {
    return (
      actionFilter(action) &&
      (action.isGroup || false) === isGroup &&
      (!action.allowed || action.allowed(element)) &&
      (!action.blocked || !action.blocked(element))
    );
  });

  // Remove trailing separator
  let stop: number = filtered.length - 1;
  for (; stop >= 0; stop--) {
    if (!filtered[stop].isSeparator) {
      break;
    }
  }
  filtered = stop >= 0 ? filtered.slice(0, stop + 1) : [];

  return filtered.map(({ isSeparator, key, title, isDisabled, action, isDanger }, index) => {
    if (isSeparator) {
      return <ContextMenuSeparator key={`separator-${index}`} />;
    }
    return (
      <ContextMenuItem
        key={key}
        element={element}
        onClick={action}
        variant={variant}
        isDisabled={isDisabled}
        isDanger={isDanger}
      >
        {title}
      </ContextMenuItem>
    );
  });
};
