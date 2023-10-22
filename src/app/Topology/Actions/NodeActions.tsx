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

import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { Dropdown, DropdownItem, DropdownProps, DropdownToggle } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import { ContextMenuItem as PFContextMenuItem } from '@patternfly/react-topology';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Observable, Subject, switchMap } from 'rxjs';
import { GraphElement, ListElement } from '../Shared/types';
import { ActionUtils, MenuItemComponent, MenuItemVariant, NodeActionFunction } from './types';

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
  const navigate = useNavigate();
  const addSubscription = useSubscriptions();
  const services = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const elementSubjRef = React.useRef(new Subject<GraphElement | ListElement>());
  const elementSubj = elementSubjRef.current;

  const [disabled, setDisabled] = React.useState(false);

  const handleOnclick = React.useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onClick && onClick(element, { navigate, services, notifications });
    },
    [onClick, navigate, services, notifications, element],
  );

  React.useEffect(() => {
    if (isDisabled) {
      addSubscription(
        elementSubj
          .pipe(
            switchMap((element) => {
              setDisabled(true);
              return isDisabled(element, { services, notifications, navigate });
            }),
          )
          .subscribe(setDisabled),
      );
    }
  }, [addSubscription, elementSubj, isDisabled, setDisabled, services, notifications, navigate]);

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
