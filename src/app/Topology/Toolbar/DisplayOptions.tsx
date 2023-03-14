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
import { groupingOptions, OptionCategory, showOptions } from '@app/Shared/Redux/Configurations/TopologyConfigSlice';
import { RootState, topologyDisplayOpionsSetIntent } from '@app/Shared/Redux/ReduxStore';
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
        dispatch(topologyDisplayOpionsSetIntent(group, key, checked));
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
