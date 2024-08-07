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
  allowedGroupFilters,
  allowedTargetFilters,
  categoryToNodeField,
} from '@app/Shared/Redux/Filters/TopologyFilterSlice';
import {
  RootState,
  topologyAddFilterIntent,
  topologyUpdateCategoryIntent,
  topologyUpdateCategoryTypeIntent,
} from '@app/Shared/Redux/ReduxStore';
import { EnvironmentNode, TargetNode } from '@app/Shared/Services/api.types';
import { flattenTree, getUniqueNodeTypes, isTargetNode } from '@app/Shared/Services/api.utils';
import { getDisplayFieldName, LABEL_TEXT_MAXWIDTH } from '@app/utils/utils';
import {
  Button,
  Divider,
  Label,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectGroup,
  SelectList,
  SelectOption,
  SelectProps,
  Switch,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon, TimesIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DiscoveryTreeContext } from '../Shared/utils';
import {
  fieldValueToStrings,
  isAnnotation,
  isLabelOrAnnotation,
  TopologyFilterGroupOption,
  TopologyFilterSelectOption,
} from './utils';

export interface TopologyFiltersProps {
  breakpoint?: 'md' | 'lg' | 'xl' | '2xl';
  isDisabled?: boolean;
}

export const TopologyFilters: React.FC<TopologyFiltersProps> = ({ breakpoint = '2xl', isDisabled, ...props }) => {
  return (
    <ToolbarToggleGroup {...props} toggleIcon={<FilterIcon />} breakpoint={breakpoint}>
      <ToolbarGroup variant="filter-group">
        <ToolbarItem>
          <TopologyFilterCategorySelect isDisabled={isDisabled} />
        </ToolbarItem>
        <TopologyFilter isDisabled={isDisabled} />
      </ToolbarGroup>
    </ToolbarToggleGroup>
  );
};

export interface TopologyFilterCategorySelectProps {
  isDisabled?: boolean;
}

export const TopologyFilterCategorySelect: React.FC<TopologyFilterCategorySelectProps> = ({ isDisabled }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dispatch = useDispatch();

  const { isGroup, groupFilters, targetFilters } = useSelector((state: RootState) => state.topologyFilters);

  const handleSelect = React.useCallback(
    (_, category: string) => {
      if (category) {
        dispatch(topologyUpdateCategoryIntent(isGroup, category));
      }
    },
    [dispatch, isGroup],
  );

  const handleCategoryTypeChange = React.useCallback(
    (_, isChecked: boolean) => {
      dispatch(topologyUpdateCategoryTypeIntent(isChecked));
    },
    [dispatch],
  );

  const selected = React.useMemo(() => {
    return (isGroup ? groupFilters : targetFilters).category;
  }, [isGroup, targetFilters, groupFilters]);

  const options = React.useMemo(() => {
    const categories = isGroup ? allowedGroupFilters : allowedTargetFilters;
    return [
      <SelectGroup label="Category Type" key={'category-type'}>
        <SelectOption key={'switch'}>
          <Switch
            id={'category-type-switch'}
            label={'Groupings'}
            isChecked={isGroup}
            onChange={handleCategoryTypeChange}
          />
        </SelectOption>
      </SelectGroup>,
      <Divider key={'divider'} />,
      <SelectGroup label="Categories" key={'categories'}>
        {categories.map((cat) => (
          <SelectOption key={cat} value={cat}>
            {getDisplayFieldName(cat)}
          </SelectOption>
        ))}
      </SelectGroup>,
    ];
  }, [isGroup, handleCategoryTypeChange]);

  const handleToggle = React.useCallback(() => setIsOpen((open) => !open), [setIsOpen]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={handleToggle}
        isExpanded={isOpen}
        isDisabled={isDisabled}
        placeholder={'Select a category'}
      >
        {`${isGroup ? 'Group' : 'Target'}: ${getDisplayFieldName(selected)}`}
      </MenuToggle>
    ),
    [handleToggle, selected, isDisabled, isGroup, isOpen],
  );

  return (
    <Select
      toggle={toggle}
      onSelect={handleSelect}
      isOpen={isOpen}
      selected={selected}
      aria-label={'Filter Categories'}
      onOpenChangeKeys={['Escape']}
      onOpenChange={setIsOpen}
    >
      <SelectList>{options}</SelectList>
    </Select>
  );
};

export interface TopologyFilterProps {
  isDisabled?: boolean;
}

export const TopologyFilter: React.FC<TopologyFilterProps> = ({ isDisabled }) => {
  const dispatch = useDispatch();
  const { isGroup, groupFilters, targetFilters } = useSelector((state: RootState) => state.topologyFilters);
  const discoveryTree = React.useContext(DiscoveryTreeContext);

  const flattenedTree = React.useMemo(() => flattenTree(discoveryTree), [discoveryTree]);

  const groupNodeTypes = React.useMemo(
    () => getUniqueNodeTypes(flattenedTree.filter((n) => !isTargetNode(n))),
    [flattenedTree],
  );

  const onSelect = React.useCallback(
    (_: React.MouseEvent<Element, MouseEvent> | undefined, { isGroup, value, nodeType, category }) => {
      dispatch(topologyAddFilterIntent(isGroup, nodeType, category, value));
    },
    [dispatch],
  );

  const groupInputs = React.useMemo(() => {
    return allowedGroupFilters.map((cat) => {
      const isShown = isGroup && groupFilters.category === cat;
      const ariaLabel = `Filter by ${getDisplayFieldName(cat)}...`;

      const selectOptions = groupNodeTypes
        .map<TopologyFilterGroupOption>((type) => ({
          groupLabel: type,
          category: cat,
          options: Array.from(
            new Set(
              flattenedTree
                .filter((n) => n.nodeType === type)
                .map((groupNode: EnvironmentNode) => fieldValueToStrings(groupNode[categoryToNodeField(cat)]))
                .reduce((acc, curr) => acc.concat(curr), [])
                .filter((val) => {
                  const filters = groupFilters.filters[type];
                  if (filters) {
                    const criteria = filters[cat];
                    return !criteria || !criteria.includes(val);
                  }
                  return true;
                })
                .map<TopologyFilterSelectOption>((val) => ({
                  value: val,
                  render: () =>
                    isLabelOrAnnotation(cat) ? (
                      <Label color="grey" textMaxWidth={LABEL_TEXT_MAXWIDTH}>
                        {val}
                      </Label>
                    ) : (
                      val
                    ),
                })),
            ),
          ),
        }))
        .filter((group) => group.options && group.options.length); // Do show show empty groups

      return (
        <ToolbarFilter
          key={`Group/${cat}`}
          showToolbarItem={isShown}
          categoryName={`Group/${cat}`} // Ignored. No chips specified here.
        >
          <TopologyFilterSelect
            isDisabled={isDisabled}
            placeHolder={ariaLabel}
            aria-label={ariaLabel}
            options={selectOptions}
            onSelect={onSelect}
          />
        </ToolbarFilter>
      );
    });
  }, [isGroup, groupFilters, flattenedTree, groupNodeTypes, isDisabled, onSelect]);

  const targetInputs = React.useMemo(() => {
    return allowedTargetFilters.map((cat) => {
      const isShown = !isGroup && targetFilters.category === cat;
      const ariaLabel = `Filter by ${getDisplayFieldName(cat)}...`;

      const options: TopologyFilterGroupOption[] = [
        {
          category: cat,
          options: Array.from(
            new Set(
              flattenedTree
                .filter((n) => isTargetNode(n))
                .map(({ target }: TargetNode) => {
                  const value = target[categoryToNodeField(cat)];
                  if (isAnnotation(cat)) {
                    return [...fieldValueToStrings(value['platform']), ...fieldValueToStrings(value['cryostat'])];
                  }
                  return fieldValueToStrings(value);
                })
                .reduce((acc, curr) => acc.concat(curr), [])
                .filter((val) => {
                  const criteria: string[] = targetFilters.filters[cat];
                  return !criteria || !criteria.includes(val);
                })
                .map<TopologyFilterSelectOption>((val) => ({
                  value: val,
                  render: () =>
                    isLabelOrAnnotation(cat) ? (
                      <Label color="grey" textMaxWidth={LABEL_TEXT_MAXWIDTH}>
                        {val}
                      </Label>
                    ) : (
                      val
                    ),
                })),
            ),
          ),
        },
      ];

      return (
        <ToolbarFilter
          key={`Target/${cat}`}
          categoryName={`Target/${cat}`} // Ignored.
          showToolbarItem={isShown}
        >
          <TopologyFilterSelect
            isDisabled={isDisabled}
            placeHolder={ariaLabel}
            aria-label={ariaLabel}
            options={options}
            onSelect={onSelect}
          />
        </ToolbarFilter>
      );
    });
  }, [isGroup, targetFilters, flattenedTree, isDisabled, onSelect]);

  return (
    <>
      {groupInputs}
      {targetInputs}
    </>
  );
};

export interface TopologyFilterSelectProps extends Omit<SelectProps, 'toggle' | 'onSelect'> {
  isDisabled?: boolean;
  placeHolder?: string;
  options: TopologyFilterGroupOption[];
  onSelect: (_: React.MouseEvent<Element, MouseEvent> | undefined, { isGroup, value, nodeType, category }) => void;
}

export const TopologyFilterSelect: React.FC<TopologyFilterSelectProps> = ({
  isDisabled,
  placeHolder,
  options = [],
  onSelect,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState('');

  const handleToggle = React.useCallback(() => setIsExpanded((open) => !open), [setIsExpanded]);

  const onInputChange = React.useCallback((_, value: string) => setFilterValue(value), [setFilterValue]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        variant="typeahead"
        onClick={handleToggle}
        isExpanded={isExpanded}
        isFullWidth
        isDisabled={isDisabled}
      >
        <TextInputGroup isPlain>
          <TextInputGroupMain
            value={filterValue}
            onClick={handleToggle}
            onChange={onInputChange}
            autoComplete="off"
            placeholder={placeHolder}
            isExpanded={isExpanded}
            role="combobox"
          />
          <TextInputGroupUtilities>
            {filterValue ? (
              <Button variant="plain" onClick={() => setFilterValue('')} aria-label="Clear input value">
                <TimesIcon aria-hidden />
              </Button>
            ) : null}
          </TextInputGroupUtilities>
        </TextInputGroup>
      </MenuToggle>
    ),
    [handleToggle, isExpanded, filterValue, onInputChange, setFilterValue, placeHolder, isDisabled],
  );

  const selectOptions = React.useMemo(() => {
    return options.map(({ groupLabel, category, options }) => {
      const _opts = options.map(({ value, render = () => undefined }) => (
        <SelectOption
          key={value}
          value={value}
          onClick={(e) => {
            onSelect(e, { isGroup: !!groupLabel, nodeType: groupLabel, category: category, value: value });
          }}
        >
          {render()}
        </SelectOption>
      ));

      if (groupLabel) {
        return (
          <SelectGroup key={groupLabel} label={groupLabel}>
            {_opts}
          </SelectGroup>
        );
      }
      return _opts;
    });
  }, [onSelect, options]);

  return (
    <Select
      {...props}
      isOpen={isExpanded}
      toggle={toggle}
      onSelect={() => {
        setIsExpanded(false);
      }}
      onOpenChange={setIsExpanded}
      onOpenChangeKeys={['Escape']}
    >
      <SelectList>
        {selectOptions.length > 0 ? selectOptions : <SelectOption isDisabled>No results found</SelectOption>}
      </SelectList>
    </Select>
  );
};
