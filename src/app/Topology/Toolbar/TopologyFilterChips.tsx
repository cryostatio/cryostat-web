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
import { TopologyFilters } from '@app/Shared/Redux/Filters/TopologyFilterSlice';
import {
  RootState,
  topologyDeleteCategoryFiltersIntent,
  topologyDeleteFilterIntent,
} from '@app/Shared/Redux/ReduxStore';
import { NodeType } from '@app/Shared/Services/api.types';
import { getDisplayFieldName } from '@app/utils/utils';
import { Chip, ChipGroup } from '@patternfly/react-core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';

export interface TopologyFilterChipsProps {
  className?: string;
}

export const TopologyFilterChips: React.FC<TopologyFilterChipsProps> = ({ className, ...props }) => {
  const { groupFilters, targetFilters } = useSelector((state: RootState) => state.topologyFilters);

  const generateChip = React.useCallback(
    ({ filters }: TopologyFilters['groupFilters'] | TopologyFilters['targetFilters'], isGroupCategory: boolean) => {
      if (isGroupCategory) {
        return Object.entries(filters).map(([nodeType, filter]) => {
          return Object.entries(filter).map(([category, values]) => {
            return (
              <TopologyFilterChip
                key={`${nodeType}-${category}`}
                isGroupCategory={isGroupCategory}
                category={category}
                chipValues={values as string[]}
                nodeType={nodeType as NodeType}
                className="topology__filter-chip-group"
              />
            );
          });
        });
      } else {
        return Object.entries(filters).map(([category, values]) => {
          return (
            <TopologyFilterChip
              key={`Target-${category}`}
              isGroupCategory={isGroupCategory}
              category={category}
              chipValues={values as string[]}
              nodeType={'Target'} // Ignored by reducer, just for display
              className="topology__filter-chip-group"
            />
          );
        });
      }
    },
    [],
  );

  const groupChips = React.useMemo(() => generateChip(groupFilters, true), [groupFilters, generateChip]);

  const targetChips = React.useMemo(() => generateChip(targetFilters, false), [targetFilters, generateChip]);

  return (
    <div {...props} className={className}>
      {groupChips}
      {targetChips}
    </div>
  );
};

export interface TopologyFilterChipProps {
  isGroupCategory: boolean;
  category: string;
  nodeType: string;
  chipValues: string[];
  className?: string;
}

export const TopologyFilterChip: React.FC<TopologyFilterChipProps> = ({
  isGroupCategory,
  className,
  category,
  nodeType,
  chipValues,
  ...props
}) => {
  const dispatch = useDispatch();

  const handleDeleteChip = React.useCallback(
    (value: string) => {
      dispatch(topologyDeleteFilterIntent(isGroupCategory, nodeType, category, value));
    },
    [dispatch, isGroupCategory, nodeType, category],
  );

  const handleDeleteChipGroup = React.useCallback(() => {
    dispatch(topologyDeleteCategoryFiltersIntent(isGroupCategory, nodeType, category));
  }, [dispatch, isGroupCategory, nodeType, category]);

  return (
    <ChipGroup
      {...props}
      categoryName={`${nodeType}/${getDisplayFieldName(category)}`}
      isClosable
      onClick={handleDeleteChipGroup}
      className={className}
    >
      {chipValues.map((value) => (
        <Chip key={value} onClick={() => handleDeleteChip(value)}>
          {value}
        </Chip>
      ))}
    </ChipGroup>
  );
};
