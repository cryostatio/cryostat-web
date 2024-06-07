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

import { NotificationService } from '@app/Shared/Services/Notifications.service';
import type { FeatureLevel } from '@app/Shared/Services/service.types';
import { Services } from '@app/Shared/Services/Services';
import { LabelProps, DropdownItemProps } from '@patternfly/react-core';
import { ContextMenuItem as PFContextMenuItem } from '@patternfly/react-topology';
import * as React from 'react';
import { NavigateFunction } from 'react-router-dom';
import { Observable } from 'rxjs';
import type { GraphElement, ListElement } from '../Shared/types';

export interface ActionUtils {
  navigate: NavigateFunction;
  services: Services;
  notifications: NotificationService;
}

export interface QuickSearchItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
  labels?: {
    content: string;
    color?: LabelProps['color'];
    icon?: React.ReactNode;
  }[];
  descriptionShort?: string;
  descriptionFull?: string;
  featureLevel: FeatureLevel;
  disabled?: boolean;
  actionText?: React.ReactNode;
  createAction?: (utils: ActionUtils) => void;
}

export type NodeActionFunction = (element: GraphElement | ListElement, actionUtils: ActionUtils) => void;

export type MenuItemVariant = 'dropdownItem' | 'contextMenuItem';

export type MenuItemComponent = React.FC<DropdownItemProps> | React.FC<React.ComponentProps<typeof PFContextMenuItem>>;

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

export interface NodeAction {
  readonly key: NodeActionKey;
  readonly isGroup?: boolean;
  readonly action?: NodeActionFunction;
  readonly title?: React.ReactNode;
  readonly isSeparator?: boolean;
  readonly isDisabled?: (element: GraphElement | ListElement, actionUtils: ActionUtils) => Observable<boolean>;
  readonly allowed?: (element: GraphElement | ListElement) => boolean; // Undefined means allowing all
  readonly blocked?: (element: GraphElement | ListElement) => boolean; // Undefined means blocking none
}

export type GroupActionResponse = {
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
