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
  topologyDeleteCategoryFiltersIntent,
  topologyDeleteFilterIntent,
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
import { flattenTree } from '../Shared/utils';
import { DiscoveryTreeContext } from '../Topology';
import { EnvironmentNode, isTargetNode, NodeType, TargetNode } from '../typings';

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

  const generateOnSelect = React.useCallback(
    (
      isGroup: boolean,
      nodeType: NodeType,
      category: string // key
    ) => {
      return (_, value) => {
        dispatch(topologyAddFilterIntent(isGroup, nodeType, category, value));
      };
    },
    [dispatch]
  );

  const generateDeleteChip = React.useCallback(
    (
      isGroup: boolean,
      nodeType: NodeType,
      category: string // key
    ) => {
      return (_, chip) => {
        dispatch(topologyDeleteFilterIntent(isGroup, nodeType, category, chip));
      };
    },
    [dispatch]
  );

  const generateDeleteChipGroup = React.useCallback(
    (
      isGroup: boolean,
      nodeType: NodeType,
      category: string // key
    ) => {
      return () => {
        dispatch(topologyDeleteCategoryFiltersIntent(isGroup, nodeType, category));
      };
    },
    [dispatch]
  );

  const groupInputs = React.useMemo(() => {
    return allowedGroupFilters.map((cat) => {
      const category = `Group/${cat}`;
      const isShown = isGroup && groupFilters.category === cat;
      const ariaLabel = `Filter by ${cat}...`;
      const options = Array.from(
        new Set( // Removing duplicates
          flattenedTree
            .filter((node) => !isTargetNode(node))
            .map((groupNode: EnvironmentNode) => fieldValueToStrings(groupNode[categoryToNodeField(cat)]))
            .reduce((prev, curr) => prev.concat(curr))
            .filter((val) => {
              const criteria: string[] = groupFilters.filters[cat];
              return !criteria || !criteria.includes(val);
            })
        )
      ).map((value) => {
        return (
          <SelectOption key={value} value={value}>
            {isLabelOrAnnotation(cat) ? <Label color="grey">{value}</Label> : value}
          </SelectOption>
        );
      });

      return (
        <ToolbarFilter
          key={`${category}-filter`}
          categoryName={category}
          showToolbarItem={isShown}
          chips={groupFilters.filters[cat]}
          deleteChip={generateDeleteChip(true, cat)}
          deleteChipGroup={generateDeleteChipGroup(true, cat)}
        >
          <TopologySelect
            isDisabled={isDisabled}
            placeholderText={ariaLabel}
            aria-label={ariaLabel}
            typeAheadAriaLabel={ariaLabel}
            maxHeight="16em"
            onSelect={generateOnSelect(isGroup, cat)}
          >
            {options}
          </TopologySelect>
        </ToolbarFilter>
      );
    });
  }, [isGroup, groupFilters, flattenedTree, isDisabled, generateOnSelect, generateDeleteChip, generateDeleteChipGroup]);

  const targetInputs = React.useMemo(() => {
    return allowedTargetFilters.map((cat) => {
      const category = `Target/${cat}`;
      const isShown = !isGroup && targetFilters.category === cat;
      const ariaLabel = `Filter by ${cat}...`;

      const targetNodes = flattenedTree.filter((node) => isTargetNode(node));

      let options: JSX.Element[];
      if (isAnnotation(cat)) {
        const anntationGroups = targetNodes
          .map(({ target }: TargetNode) => {
            const anntations = target[categoryToNodeField(cat)] || {};
            return Object.entries(anntations).map(([k, v]) => ({
              groupLabel: k,
              values: fieldValueToStrings(v).filter((val) => {
                const criteria: string[] = targetFilters.filters[cat];
                return !criteria || !criteria.includes(val);
              }),
            }));
          })
          .reduce((prev, curr) => prev.concat(curr));

        // This is a shortcut while assuming only these 2 types are supported
        options = [
          {
            groupLabel: 'cryostat',
            matched: anntationGroups.filter((grp) => grp.groupLabel === 'cryostat'),
          },
          {
            groupLabel: 'platform',
            matched: anntationGroups.filter((grp) => grp.groupLabel === 'platform'),
          },
        ].map(({ matched, groupLabel }) => {
          const allOptions = Array.from(
            new Set(matched.reduce((prev, curr) => prev.concat(curr.values), [] as string[]))
          );

          if (!allOptions.length) {
            return <React.Fragment key={`empty-${groupLabel}`} />; // Do not show empty group
          }

          return (
            <SelectGroup key={groupLabel} label={groupLabel}>
              {allOptions.map((val) => (
                <SelectOption key={val} value={val}>
                  {isLabelOrAnnotation(cat) ? <Label color="grey">{val}</Label> : val}
                </SelectOption>
              ))}
            </SelectGroup>
          );
        });
      } else {
        options = Array.from(
          new Set( // Removing duplicates
            targetNodes
              .map(({ target }: TargetNode) => fieldValueToStrings(target[categoryToNodeField(cat)]))
              .reduce((prev, curr) => prev.concat(curr))
              .filter((val) => {
                const criteria: string[] = targetFilters.filters[cat];
                return !criteria || !criteria.includes(val);
              })
          )
        ).map((value) => {
          return (
            <SelectOption key={value} value={value}>
              {isLabelOrAnnotation(cat) ? <Label color="grey">{value}</Label> : value}
            </SelectOption>
          );
        });
      }

      return (
        <ToolbarFilter
          key={`${category}-filter`}
          categoryName={category}
          showToolbarItem={isShown}
          chips={targetFilters.filters[cat]}
          deleteChip={generateDeleteChip(false, cat)}
          deleteChipGroup={generateDeleteChipGroup(false, cat)}
        >
          <TopologySelect
            isDisabled={isDisabled}
            placeholderText={ariaLabel}
            aria-label={ariaLabel}
            typeAheadAriaLabel={ariaLabel}
            maxHeight="16em"
            isGrouped={isAnnotation(cat)}
            onSelect={generateOnSelect(false, cat)}
          >
            {options}
          </TopologySelect>
        </ToolbarFilter>
      );
    });
  }, [
    isGroup,
    targetFilters,
    flattenedTree,
    isDisabled,
    generateOnSelect,
    generateDeleteChip,
    generateDeleteChipGroup,
  ]);

  return (
    <div {...props}>
      {groupInputs}
      {targetInputs}
    </div>
  );
};

export const TopologySelect: React.FC<Omit<SelectProps, 'onToggle' | 'selections' | 'variant'>> = ({
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
