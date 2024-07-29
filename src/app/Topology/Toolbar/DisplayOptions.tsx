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
import { groupingOptions, OptionCategory, showOptions } from '@app/Shared/Redux/Configurations/TopologyConfigSlice';
import { RootState, topologyDisplayOptionsSetIntent } from '@app/Shared/Redux/ReduxStore';
import {
  Checkbox,
  Divider,
  Menu,
  MenuContainer,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuList,
  MenuToggle,
  Switch,
} from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';

export interface DisplayOptionsProps {
  isDisabled?: boolean;
  isGraph?: boolean;
}

export const DisplayOptions: React.FC<DisplayOptionsProps> = ({ isDisabled = false, isGraph: isGraphView = true }) => {
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { show, groupings } = useSelector((state: RootState) => state.topologyConfigs.displayOptions);
  const dispatch = useDispatch();
  const handleToggle = React.useCallback(() => setIsExpanded((old) => !old), [setIsExpanded]);

  const getToggleHandler = React.useCallback(
    (group: OptionCategory, key: string, source: object) => {
      return (_: React.FormEvent<HTMLInputElement>) => {
        dispatch(topologyDisplayOptionsSetIntent(group, key, !source[key]));
      };
    },
    [dispatch],
  );

  const checkBoxContents = React.useMemo(() => {
    return showOptions.map(([option, key]) => (
      <MenuItem
        key={key}
        id={`show-${option.toLowerCase()}-checkbox`}
        hasCheckbox
        isDisabled={!isGraphView} // Allow only graph view
        isSelected={show[key]}
        onClick={getToggleHandler('show', key, show)}
      >
        {option}
      </MenuItem>
    ));
  }, [show, isGraphView, getToggleHandler]);

  const switchContents = React.useMemo(() => {
    return groupingOptions.map(([option, key]) => (
      <div key={key} className={css('pf-v5-c-menu__item')}>
        <Switch
          id={`${option.toLowerCase()}-mode`}
          label={option}
          isDisabled={key === 'collapseSingles' && groupings.realmOnly}
          isChecked={groupings[key]}
          onChange={getToggleHandler('groupings', key, groupings)}
        />
      </div>
    ));
  }, [groupings, getToggleHandler]);

  const menuContent = React.useMemo(() => {
    return (
      <Menu ref={menuRef}>
        <MenuContent>
          <MenuGroup label="Groupings" key={'groupings'}>
            <MenuList>{switchContents}</MenuList>
          </MenuGroup>
          <Divider />
          <MenuGroup label="Show" key={'show'}>
            <MenuList>{checkBoxContents}</MenuList>
          </MenuGroup>
        </MenuContent>
      </Menu>
    );
  }, [checkBoxContents, switchContents]);

  const toggle = React.useMemo(
    () => (
      <MenuToggle ref={toggleRef} onClick={handleToggle} isExpanded={isExpanded} isDisabled={isDisabled}>
        Display options
      </MenuToggle>
    ),
    [handleToggle, isExpanded, isDisabled],
  );

  return (
    <MenuContainer
      menu={menuContent}
      isOpen={isExpanded}
      onOpenChange={setIsExpanded}
      onOpenChangeKeys={['Escape']}
      menuRef={menuRef}
      toggleRef={toggleRef}
      aria-label={'Display options'}
      toggle={toggle}
    />
  );
};
