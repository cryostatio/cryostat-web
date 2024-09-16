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
import { portalRoot } from '@app/utils/utils';
import { Divider, Dropdown, DropdownItem, DropdownList, MenuToggle, MenuToggleElement } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

export interface DashboardCardActionProps {
  onRemove: () => void;
  onView: () => void;
  onResetSize: () => void;
}

export const DashboardCardActionMenu: React.FC<DashboardCardActionProps> = ({ onRemove, onResetSize, onView }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const { t } = useTranslation();

  const onSelect = React.useCallback((_) => setIsOpen(false), [setIsOpen]);

  const onToggle = React.useCallback(() => setIsOpen((isOpen) => !isOpen), [setIsOpen]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        aria-label="dashboard action toggle"
        variant="plain"
        onClick={onToggle}
        isExpanded={isOpen}
      >
        <EllipsisVIcon />
      </MenuToggle>
    ),
    [onToggle, isOpen],
  );

  return (
    <Dropdown
      popperProps={{
        enableFlip: true,
        appendTo: () => document.getElementById('dashboard-grid') || portalRoot,
        position: 'right',
      }}
      isOpen={isOpen}
      onSelect={onSelect}
      toggle={toggle}
      onOpenChange={setIsOpen}
      onOpenChangeKeys={['Escape']}
    >
      <DropdownList>
        <DropdownItem key="View" onClick={onView}>
          {t('VIEW', { ns: 'common' })}
        </DropdownItem>

        <DropdownItem key="Reset Size" onClick={onResetSize}>
          {t('DashboardCardActionMenu.RESET_SIZE')}
        </DropdownItem>
        <Divider />
        <DropdownItem key="Remove" onClick={onRemove} isDanger>
          {t('REMOVE', { ns: 'common' })}
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};
