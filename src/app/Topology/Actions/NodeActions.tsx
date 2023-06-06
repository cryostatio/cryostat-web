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

import { Notifications, NotificationsContext } from '@app/Notifications/Notifications';
import { ActiveRecording } from '@app/Shared/Services/Api.service';
import { NotificationCategory, NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Dropdown, DropdownItem, DropdownItemProps, DropdownProps, DropdownToggle } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import { ContextMenuItem as PFContextMenuItem, GraphElement } from '@patternfly/react-topology';
import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { Observable, Subject, switchMap, map, merge, filter, debounceTime } from 'rxjs';
import { getConnectUrlFromEvent } from '../Shared/Entity/utils';
import { getAllLeaves, ListElement } from '../Shared/utils';
import { EnvironmentNode, NodeType, TargetNode } from '../typings';
import { ActionUtils } from './utils';

export type NodeActionFunction = (element: GraphElement | ListElement, actionUtils: ActionUtils) => void;

export type MenuItemVariant = 'dropdownItem' | 'contextMenuItem';

export type MenuItemComponent = React.FC<DropdownItemProps> | React.FC<React.ComponentProps<typeof PFContextMenuItem>>;

export interface ContextMenuItemProps
  extends Omit<
    React.ComponentProps<typeof PFContextMenuItem> & React.ComponentProps<typeof DropdownItem>,
    'onClick' | 'isDisabled'
  > {
  onClick?: NodeActionFunction;
  element: GraphElement | ListElement;
  variant: MenuItemVariant;
  isDisabled?: (element: GraphElement | ListElement, actionUtils: ActionUtils) => Observable<boolean>;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  children,
  element,
  onClick,
  variant,
  isDisabled,
  ...props
}) => {
  const history = useHistory();
  const addSubscription = useSubscriptions();
  const services = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const elementSubjRef = React.useRef(new Subject<GraphElement | ListElement>());
  const elementSubj = elementSubjRef.current;

  const [disabled, setDisabled] = React.useState(false);

  const handleOnclick = React.useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onClick && onClick(element, { history, services, notifications });
    },
    [onClick, history, services, notifications, element]
  );

  React.useEffect(() => {
    if (isDisabled) {
      addSubscription(
        elementSubj
          .pipe(
            switchMap((element) => {
              setDisabled(true);
              return isDisabled(element, { services, notifications, history });
            })
          )
          .subscribe(setDisabled)
      );
    }
  }, [addSubscription, elementSubj, isDisabled, setDisabled, services, notifications, history]);

  React.useEffect(() => {
    elementSubj.next(element);
  }, [elementSubj, element]);

  let Component: MenuItemComponent;
  switch (variant) {
    case 'contextMenuItem':
      Component = PFContextMenuItem;
      break;
    case 'dropdownItem':
      Component = DropdownItem;
      break;
    default:
      throw new Error(`Unknown variant: ${variant}`);
  }

  return (
    <Component {...props} onClick={handleOnclick} isDisabled={disabled}>
      {children}
    </Component>
  );
};

export type NodeActionKey =
  | 'VIEW_DASHBOARD'
  | 'VIEW_RECORDINGS'
  | 'CREATE_RECORDINGS'
  | 'CREATE_RULES'
  | 'DELETE_TARGET'
  | 'GROUP_START_RECORDING'
  | 'GROUP_STOP_RECORDING'
  | 'GROUP_DELETE_RECORDING'
  | 'GROUP_ARCHIVE_RECORDING'
  | '';

export const QUICK_RECORDING_NAME = 'cryostat_topology_action';

export const QUICK_RECORDING_LABEL_KEY = 'cryostat.io.topology-group';

const isQuickRecording = (recording: ActiveRecording) => {
  return recording.name === QUICK_RECORDING_NAME;
};

const isQuickRecordingExist = (group: EnvironmentNode, { services }: ActionUtils) => {
  const svcUrls = new Set(getAllLeaves(group).map((tn) => tn.target.connectUrl));
  const filterFn = (e: NotificationMessage) => {
    const targetId = getConnectUrlFromEvent(e);
    const recording = e.message.recording;
    return targetId !== undefined && svcUrls.has(targetId) && isQuickRecording(recording);
  };

  return merge(
    services.api.groupHasRecording(group, { name: QUICK_RECORDING_NAME }),
    services.notificationChannel.messages(NotificationCategory.ActiveRecordingCreated).pipe(
      filter(filterFn),
      map((_) => true)
    ),
    services.notificationChannel.messages(NotificationCategory.ActiveRecordingDeleted).pipe(
      filter(filterFn),
      debounceTime(500),
      map((_) => services.api.groupHasRecording(group, { name: QUICK_RECORDING_NAME }))
    )
  );
};

export interface NodeAction {
  readonly key: NodeActionKey;
  readonly isGroup?: boolean;
  readonly action?: NodeActionFunction;
  readonly title?: React.ReactNode;
  readonly isSeparator?: boolean;
  readonly isDisabled?: (element: GraphElement | ListElement, actionUtils: ActionUtils) => Observable<boolean>;
  readonly includeList?: NodeType[]; // Empty means all
  readonly blockList?: NodeType[]; // Empty means none
}

export const nodeActions: NodeAction[] = [
  {
    key: 'VIEW_DASHBOARD',
    action: (element, { history, services }) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      history.push('/');
    },
    title: 'View Dashboard',
  },
  {
    key: 'VIEW_RECORDINGS',
    action: (element, { history, services }) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      history.push('/recordings');
    },
    title: 'View Recordings',
  },
  { key: '', isSeparator: true },
  {
    key: 'CREATE_RECORDINGS',
    action: (element, { history, services }) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      history.push('/recordings/create');
    },
    title: 'Create Recordings',
  },
  {
    key: 'CREATE_RULES',
    action: (element, { history, services }) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      history.push('/rules/create');
    },
    title: 'Create Automated Rules',
  },
  { key: '', isSeparator: true },
  {
    key: 'DELETE_TARGET',
    action: (element, { services }) => {
      const targetNode: TargetNode = element.getData();
      services.api.deleteTarget(targetNode.target).subscribe(() => undefined);
    },
    title: 'Delete Target',
    includeList: [NodeType.CUSTOM_TARGET],
  },
  {
    key: 'GROUP_START_RECORDING',
    title: 'Start recording',
    isGroup: true,
    action: (element, { services, notifications }) => {
      const group: EnvironmentNode = element.getData();
      services.api
        .graphql<any>(
          `
          query StartRecordingForGroup($filter: EnvironmentNodeFilterInput, $recordingName: String!, $labels: String) {
            environmentNodes(filter: $filter) {
              name
              descendantTargets {
                name
                doStartRecording(recording: {
                  name: $recordingName,
                  template: "Continuous",
                  templateType: "TARGET",
                  duration: 0,
                  restart: true,
                  metadata: {
                    labels: $labels
                  },
                  }) {
                      name
                      state
                }
              }
            }
          }
            `,
          {
            filter: { id: group.id },
            recordingName: QUICK_RECORDING_NAME,
            labels: services.api.stringifyRecordingLabels([
              {
                key: QUICK_RECORDING_LABEL_KEY,
                value: group.name.replace(/[\s+-]/g, '_'),
              },
            ]),
          },
          false,
          true
        )
        .subscribe((body) => {
          notifyGroupActionErrors('GROUP_START_RECORDING', group, body, notifications);
        });
    },
  },
  {
    key: 'GROUP_ARCHIVE_RECORDING',
    title: 'Archive recording',
    isGroup: true,
    action: (element, { services, notifications }) => {
      const group: EnvironmentNode = element.getData();
      services.api
        .graphql<any>(
          `
          query DeleteRecordingForGroup ($groupFilter: EnvironmentNodeFilterInput, $recordingFilter: ActiveRecordingFilterInput){
            environmentNodes(filter: $groupFilter) {
              name
              descendantTargets {
                name
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
            `,
          {
            groupFilter: { id: group.id },
            recordingFilter: { name: QUICK_RECORDING_NAME },
          },
          false,
          true
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
    title: 'Stop recording',
    isGroup: true,
    action: (element, { services, notifications }) => {
      const group: EnvironmentNode = element.getData();
      services.api
        .graphql<any>(
          `
          query StopRecordingForGroup ($groupFilter: EnvironmentNodeFilterInput, $recordingFilter: ActiveRecordingFilterInput){
            environmentNodes(filter: $groupFilter) {
              name
              descendantTargets {
                name
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
            `,
          {
            groupFilter: { id: group.id },
            recordingFilter: { name: QUICK_RECORDING_NAME },
          },
          false,
          true
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
    title: 'Delete recording',
    isGroup: true,
    action: (element, { services, notifications }) => {
      const group: EnvironmentNode = element.getData();
      services.api
        .graphql<any>(
          `
          query DeleteRecordingForGroup ($groupFilter: EnvironmentNodeFilterInput, $recordingFilter: ActiveRecordingFilterInput){
            environmentNodes(filter: $groupFilter) {
              name
              descendantTargets {
                name
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
            `,
          {
            groupFilter: { id: group.id },
            recordingFilter: { name: QUICK_RECORDING_NAME },
          },
          false,
          true
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

type GroupActionResponse = {
  errors?: {
    message: string;
    path: (string | number)[];
  }[];
  data: {
    environmentNodes: {
      descendantTargets: { name: string }[]; // graphql query specifies name
    }[];
  };
};

export const notifyGroupActionErrors = (
  type: Extract<
    'GROUP_START_RECORDING' | 'GROUP_ARCHIVE_RECORDING' | 'GROUP_STOP_RECORDING' | 'GROUP_DELETE_RECORDING',
    NodeActionKey
  >,
  group: EnvironmentNode,
  { errors, data }: GroupActionResponse,
  notifications: Notifications
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
        notifications.danger(`Could not ${actionVerb} for a Target in ${groupDisplay}`, err.message);
      }

      // Get the name of failed target node
      const name: string | undefined = data.environmentNodes[0]?.descendantTargets[searchIndex]?.name;

      if (name) {
        notifications.danger(`Could not ${actionVerb} for Target ${name} in ${groupDisplay}`, err.message);
      } else {
        notifications.danger(`Could not ${actionVerb} for a Target in ${groupDisplay}`, err.message);
      }
    });
  }
};

export interface ActionDropdownProps extends Omit<DropdownProps, 'isOpen' | 'onSelect' | 'toggle'> {
  actions: JSX.Element[];
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  className,
  actions,
  position,
  menuAppendTo,
  ...props
}) => {
  const [actionOpen, setActionOpen] = React.useState(false);
  const handleClose = React.useCallback(() => setActionOpen(false), [setActionOpen]);
  return (
    <Dropdown
      {...props}
      className={css(className)}
      aria-label={'entity-action-menu'}
      position={position || 'right'}
      menuAppendTo={menuAppendTo || document.body}
      onSelect={handleClose}
      isOpen={actionOpen}
      onClick={(e) => e.stopPropagation()}
      toggle={<DropdownToggle onToggle={setActionOpen}>Actions</DropdownToggle>}
      dropdownItems={actions}
    />
  );
};
