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

import { NotificationsContext } from '@app/Notifications/Notifications';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { DropdownItem, DropdownItemProps } from '@patternfly/react-core';
import { ContextMenuItem as PFContextMenuItem, GraphElement } from '@patternfly/react-topology';
import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { ListElement } from '../Shared/utils';
import { NodeType, TargetNode } from '../typings';
import { ActionUtils } from './utils';

export type NodeActionFunction = (
  element: GraphElement | ListElement,
  actionUtils: ActionUtils,
  track: ReturnType<typeof useSubscriptions>
) => void;

export type MenuItemVariant = 'dropdownItem' | 'contextMenuItem';

export interface ContextMenuItemProps
  extends Omit<React.ComponentProps<typeof PFContextMenuItem> & React.ComponentProps<typeof DropdownItem>, 'onClick'> {
  onClick?: NodeActionFunction;
  element: GraphElement | ListElement;
  variant: MenuItemVariant;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ children, element, onClick, variant, ...props }) => {
  const history = useHistory();
  const services = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();

  const handleOnclick = React.useCallback(() => {
    onClick && onClick(element, { history, services, notifications }, addSubscription);
  }, [onClick, history, services, notifications, addSubscription, element]);

  let Comp: React.FC<DropdownItemProps> | React.ComponentProps<typeof PFContextMenuItem>;
  switch (variant) {
    case 'contextMenuItem':
      Comp = PFContextMenuItem;
      break;
    case 'dropdownItem':
      Comp = DropdownItem;
      break;
    default:
      throw new Error('unknown variant');
  }

  return (
    <Comp onClick={handleOnclick} {...props}>
      {children}
    </Comp>
  );
};

export interface NodeAction {
  action?: NodeActionFunction;
  title?: React.ReactNode;
  isSeparator?: boolean;
  includeList?: NodeType[]; // Empty means all
  blockList?: NodeType[]; // Empty means none
}

export const nodeActions: NodeAction[] = [
  {
    action: (element, { history, services }, _) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      history.push('/');
    },
    title: 'View Dashboard',
  },
  {
    action: (element, { history, services }, _) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      history.push('/recordings');
    },
    title: 'View Recordings',
  },
  { isSeparator: true },
  {
    action: (element, { history, services }, _) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      history.push('/recordings/create');
    },
    title: 'Create Recordings',
  },
  {
    action: (element, { history, services }, _) => {
      const targetNode: TargetNode = element.getData();

      services.target.setTarget(targetNode.target);
      history.push('/rules/create');
    },
    title: 'Create Automated Rules',
  },
  { isSeparator: true },
  {
    action: (element, { services }, track) => {
      const targetNode: TargetNode = element.getData();
      track(services.api.deleteTarget(targetNode.target).subscribe(() => undefined));
    },
    title: 'Delete Target',
    includeList: [NodeType.CUSTOM_TARGET],
  },
];
