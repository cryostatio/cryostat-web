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
import { getDisplayFieldName } from '@app/utils/utils';
import {
  Divider,
  Label,
  Select,
  SelectGroup,
  SelectOption,
  SelectProps,
  SelectVariant,
  Switch,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DiscoveryTreeContext, flattenTree, getUniqueNodeTypes } from '../Shared/utils';
import { EnvironmentNode, isTargetNode, TargetNode } from '../typings';

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

export const TopologyFilterCategorySelect: React.FC<{ isDisabled?: boolean }> = ({ isDisabled, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dispatch = useDispatch();

  const { isGroup, groupFilters, targetFilters } = useSelector((state: RootState) => state.topologyFilters);

  const handleSelect = React.useCallback(
    (_, value, placeholder: boolean) => {
      if (!placeholder) {
        const { category } = value;
        dispatch(topologyUpdateCategoryIntent(isGroup, category));
      }
    },
    [dispatch, isGroup]
  );

  const handleCategoryTypeChange = React.useCallback(
    (isChecked: boolean) => {
      dispatch(topologyUpdateCategoryTypeIntent(isChecked));
    },
    [dispatch]
  );

  const selected = React.useMemo(() => {
    return (isGroup ? groupFilters : targetFilters).category;
  }, [isGroup, targetFilters, groupFilters]);

  const options = React.useMemo(() => {
    const categories = isGroup ? allowedGroupFilters : allowedTargetFilters;
    return [
      <SelectGroup label="Category Type" key={'category-type'}>
        <SelectOption isPlaceholder key={'switch'} value={''}>
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
          <SelectOption
            key={cat}
            value={{
              toString: () => getDisplayFieldName(cat),
              compareTo: (other) => other.category === cat,
              ...{
                category: cat,
              },
            }}
          >
            {getDisplayFieldName(cat)}
          </SelectOption>
        ))}
      </SelectGroup>,
    ];
  }, [isGroup, handleCategoryTypeChange]);

  return (
    <Select
      {...props}
      variant={SelectVariant.single}
      onToggle={setIsOpen}
      onSelect={handleSelect}
      isDisabled={isDisabled}
      isOpen={isOpen}
      selections={{
        toString: () => `${isGroup ? 'Group' : 'Target'}: ${getDisplayFieldName(selected)}`,
        compareTo: (other) => other.category === selected,
        ...{
          category: selected,
        },
      }}
      aria-label={'Filter Categories'}
      placeholderText={'Select a category'}
      isGrouped
    >
      {options}
    </Select>
  );
};

export const TopologyFilter: React.FC<{ isDisabled?: boolean }> = ({ isDisabled, ...props }) => {
  const dispatch = useDispatch();
  const { isGroup, groupFilters, targetFilters } = useSelector((state: RootState) => state.topologyFilters);
  const discoveryTree = React.useContext(DiscoveryTreeContext);

  const flattenedTree = React.useMemo(() => flattenTree(discoveryTree), [discoveryTree]);

  const groupNodeTypes = React.useMemo(
    () => getUniqueNodeTypes(flattenedTree.filter((n) => !isTargetNode(n))),
    [flattenedTree]
  );

  const targetNodeTypes = React.useMemo(
    () => getUniqueNodeTypes(flattenedTree.filter((n) => isTargetNode(n))),
    [flattenedTree]
  );

  const generateOnSelect = React.useCallback(
    (isGroup: boolean) => {
      return (_, { value, nodeType, category }) => {
        dispatch(topologyAddFilterIntent(isGroup, nodeType, category, value));
      };
    },
    [dispatch]
  );

  const groupInputs = React.useMemo(() => {
    return allowedGroupFilters.map((cat) => {
      const isShown = isGroup && groupFilters.category === cat;
      const ariaLabel = `Filter by ${getDisplayFieldName(cat)}...`;

      const optionGroup = groupNodeTypes
        .map((type) => ({
          groupLabel: type,
          options: Array.from(
            new Set(
              flattenedTree
                .filter((n) => n.nodeType === type)
                .map((groupNode: EnvironmentNode) => fieldValueToStrings(groupNode[categoryToNodeField(cat)]))
                .reduce((prev, curr) => prev.concat(curr))
                .filter((val) => {
                  const filters = groupFilters.filters[type] || {};
                  if (filters) {
                    const criteria = filters[cat] || [];
                    return !criteria || !criteria.includes(val);
                  }
                  return true;
                })
            )
          ),
        }))
        .filter((group) => group.options && group.options.length); // Do show show empty groups

      const selectOptions = optionGroup.map(({ options, groupLabel }) => {
        return (
          <SelectGroup key={groupLabel} label={groupLabel}>
            {options.map((opt) => (
              <SelectOption
                key={opt}
                value={{
                  toString: () => opt,
                  compareTo: (other) => other.value === opt,
                  ...{
                    nodeType: groupLabel,
                    value: opt,
                    category: cat,
                  },
                }}
              >
                {isLabelOrAnnotation(cat) ? <Label color="grey">{opt}</Label> : opt}
              </SelectOption>
            ))}
          </SelectGroup>
        );
      });

      return (
        <ToolbarFilter
          key={`Group/${cat}`}
          showToolbarItem={isShown}
          categoryName={`Group/${cat}`} // Ignored. No chips specified here.
        >
          <TopologyFilterSelect
            isDisabled={isDisabled}
            placeholderText={ariaLabel}
            aria-label={ariaLabel}
            typeAheadAriaLabel={ariaLabel}
            maxHeight="16em"
            isGrouped
            onSelect={generateOnSelect(isGroup)}
          >
            {selectOptions}
          </TopologyFilterSelect>
        </ToolbarFilter>
      );
    });
  }, [isGroup, groupFilters, flattenedTree, groupNodeTypes, isDisabled, generateOnSelect]);

  const targetInputs = React.useMemo(() => {
    return allowedTargetFilters.map((cat) => {
      const isShown = !isGroup && targetFilters.category === cat;
      const ariaLabel = `Filter by ${getDisplayFieldName(cat)}...`;

      const optionGroup = targetNodeTypes
        .map((type) => ({
          groupLabel: type,
          options: Array.from(
            new Set(
              flattenedTree
                .filter((n) => n.nodeType === type)
                .map(({ target }: TargetNode) => {
                  const value = target[categoryToNodeField(cat)];
                  if (isAnnotation(cat)) {
                    return [...fieldValueToStrings(value['platform']), ...fieldValueToStrings(value['cryostat'])];
                  }
                  return fieldValueToStrings(value);
                })
                .reduce((prev, curr) => prev.concat(curr))
                .filter((val) => {
                  const filters = targetFilters.filters[type] || {};
                  if (filters) {
                    const criteria = filters[cat] || [];
                    return !criteria || !criteria.includes(val);
                  }
                  return true;
                })
            )
          ),
        }))
        .filter((group) => group.options && group.options.length); // Do show show empty groups;

      const selectOptions = optionGroup.map(({ options, groupLabel }) => {
        return (
          <SelectGroup key={groupLabel} label={groupLabel}>
            {options.map((opt) => (
              <SelectOption
                key={opt}
                value={{
                  toString: () => opt,
                  compareTo: (other) => other.value === opt,
                  ...{
                    nodeType: groupLabel,
                    value: opt,
                    category: cat,
                  },
                }}
              >
                {isLabelOrAnnotation(cat) ? <Label color="grey">{opt}</Label> : opt}
              </SelectOption>
            ))}
          </SelectGroup>
        );
      });

      return (
        <ToolbarFilter
          key={`Target/${cat}`}
          categoryName={`Target/${cat}`} // Ignored.
          showToolbarItem={isShown}
        >
          <TopologyFilterSelect
            isDisabled={isDisabled}
            placeholderText={ariaLabel}
            aria-label={ariaLabel}
            typeAheadAriaLabel={ariaLabel}
            maxHeight="16em"
            isGrouped
            onSelect={generateOnSelect(false)}
          >
            {selectOptions}
          </TopologyFilterSelect>
        </ToolbarFilter>
      );
    });
  }, [isGroup, targetNodeTypes, targetFilters, flattenedTree, isDisabled, generateOnSelect]);

  return (
    <div {...props}>
      {groupInputs}
      {targetInputs}
    </div>
  );
};

export const TopologyFilterSelect: React.FC<Omit<SelectProps, 'onToggle' | 'selections' | 'variant'>> = ({
  children: options,
  onSelect,
  isDisabled,
  placeholderText,
  ...props
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Select
      {...props}
      variant={SelectVariant.typeahead}
      isOpen={isOpen}
      onToggle={setIsOpen}
      onSelect={(...args) => {
        setIsOpen(false);
        onSelect && onSelect(...args);
      }}
      isDisabled={isDisabled}
      placeholderText={placeholderText}
    >
      {options}
    </Select>
  );
};

export const fieldValueToStrings = (value: unknown): string[] => {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map((v) => `${v}`);
    } else {
      return Object.entries(value as object).map(([k, v]) => `${k}=${v}`);
    }
  } else {
    return [`${value}`];
  }
};

export const isLabelOrAnnotation = (category: string) => /(label|annotation)/i.test(category);

export const isAnnotation = (category: string) => /annotation/i.test(category);
