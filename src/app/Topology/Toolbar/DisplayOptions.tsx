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
import { Checkbox, Divider, Select, Stack, StackItem, Switch } from '@patternfly/react-core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';

export interface DisplayOptionsProps {
  isDisabled?: boolean;
  isGraph?: boolean;
}

export const DisplayOptions: React.FC<DisplayOptionsProps> = ({
  isDisabled = false,
  isGraph: isGraphView = true,
  ...props
}) => {
  const [open, setOpen] = React.useState(false);
  const { show, groupings } = useSelector((state: RootState) => state.topologyConfigs.displayOptions);
  const dispatch = useDispatch();
  const handleToggle = React.useCallback(() => setOpen((old) => !old), [setOpen]);

  const getChangeHandler = React.useCallback(
    (group: OptionCategory, key: string) => {
      return (checked: boolean, _) => {
        dispatch(topologyDisplayOptionsSetIntent(group, key, checked));
      };
    },
    [dispatch]
  );

  const checkBoxContents = React.useMemo((): [string, JSX.Element][] => {
    return showOptions.map(([option, key]) => [
      key,
      <Checkbox
        key={key}
        id={`show-${option.toLowerCase()}-checkbox`}
        className={'topology__display-option-menu-item'}
        label={option}
        isChecked={show[key]}
        onChange={getChangeHandler('show', key)}
        isDisabled={!isGraphView} // Allow only graph view
      />,
    ]);
  }, [show, isGraphView, getChangeHandler]);

  const switchContents = React.useMemo((): [string, JSX.Element][] => {
    return groupingOptions.map(([option, key]) => [
      key,
      <Switch
        key={key}
        id={`${option.toLowerCase()}-mode`}
        className={'topology__display-option-menu-item'}
        label={option}
        isDisabled={key === 'collapseSingles' && groupings.realmOnly}
        isChecked={groupings[key]}
        onChange={getChangeHandler('groupings', key)}
      />,
    ]);
  }, [groupings, getChangeHandler]);

  const menuContent = React.useMemo(() => {
    return (
      <Stack className="topology__display-option-menu">
        <StackItem key={'mode-group-title'}>
          <span className="pf-c-select__menu-group-title">Groupings</span>
        </StackItem>
        {switchContents.map(([key, children]) => (
          <StackItem key={key}>{children}</StackItem>
        ))}
        <StackItem key={'divider0'}>
          <Divider />
        </StackItem>
        <StackItem key={'show-group-title'}>
          <span className="pf-c-select__menu-group-title">Show</span>
        </StackItem>
        {checkBoxContents.map(([key, children]) => (
          <StackItem key={key}>{children}</StackItem>
        ))}
      </Stack>
    );
  }, [checkBoxContents, switchContents]);

  return (
    <Select
      {...props}
      menuAppendTo={'parent'}
      onToggle={handleToggle}
      isDisabled={isDisabled}
      isOpen={open}
      aria-label={'Display Options'}
      placeholderText={'Display options'}
      customContent={menuContent}
    />
  );
};
