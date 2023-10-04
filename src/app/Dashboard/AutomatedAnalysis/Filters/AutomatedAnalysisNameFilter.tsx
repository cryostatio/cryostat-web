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

import { CategorizedRuleEvaluations } from '@app/Shared/Services/api.types';
import { portalRoot } from '@app/utils/utils';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import * as React from 'react';

export interface AutomatedAnalysisNameFilterProps {
  evaluations: CategorizedRuleEvaluations[];
  filteredNames: string[];
  onSubmit: (inputName: string) => void;
}

export const AutomatedAnalysisNameFilter: React.FC<AutomatedAnalysisNameFilterProps> = ({ onSubmit, ...props }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const onSelect = React.useCallback(
    (_, selection, isPlaceholder) => {
      if (!isPlaceholder) {
        setIsExpanded(false);
        onSubmit(selection);
      }
    },
    [onSubmit, setIsExpanded],
  );

  const nameOptions = React.useMemo(() => {
    const flatEvalMap: string[] = [] as string[];
    for (const topic of props.evaluations.map((r) => r[1])) {
      for (const rule of topic) {
        flatEvalMap.push(rule.name);
      }
    }
    return flatEvalMap
      .filter((n) => !props.filteredNames.includes(n))
      .sort()
      .map((option, index) => <SelectOption key={index} value={option} />);
  }, [props.evaluations, props.filteredNames]);

  return (
    <Select
      variant={SelectVariant.typeahead}
      onToggle={setIsExpanded}
      onSelect={onSelect}
      isOpen={isExpanded}
      typeAheadAriaLabel="Filter by name..."
      placeholderText="Filter by name..."
      aria-label="Filter by name"
      maxHeight="16em"
      menuAppendTo={() => document.getElementById('dashboard-grid') || portalRoot}
    >
      {nameOptions}
    </Select>
  );
};
