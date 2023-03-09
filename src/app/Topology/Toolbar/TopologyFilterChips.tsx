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
import { TopologyFilters } from '@app/Shared/Redux/Filters/TopologyFilterSlice';
import {
  RootState,
  topologyDeleteCategoryFiltersIntent,
  topologyDeleteFilterIntent,
} from '@app/Shared/Redux/ReduxStore';
import { getDisplayFieldName } from '@app/utils/utils';
import { Chip, ChipGroup } from '@patternfly/react-core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NodeType } from '../typings';

export interface TopologyFilterChipsProps {
  className?: string;
}

export const TopologyFilterChips: React.FC<TopologyFilterChipsProps> = ({ className, ...props }) => {
  const { groupFilters, targetFilters } = useSelector((state: RootState) => state.topologyFilters);

  const generateChip = React.useCallback(
    ({ filters }: TopologyFilters['groupFilters'] | TopologyFilters['targetFilters'], isGroupCategory: boolean) => {
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
    },
    []
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
  nodeType: NodeType;
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
    [dispatch, isGroupCategory, nodeType, category]
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
