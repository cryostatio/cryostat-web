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

import { CategorizedRuleEvaluations } from '@app/Shared/Services/Report.service';
import { portalRoot } from '@app/utils/utils';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import React from 'react';

export interface AutomatedAnalysisTopicFilterProps {
  evaluations: CategorizedRuleEvaluations[];
  filteredTopics: string[];
  onSubmit: (inputName: string) => void;
}

export const AutomatedAnalysisTopicFilter: React.FC<AutomatedAnalysisTopicFilterProps> = ({ onSubmit, ...props }) => {
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

  const topicOptions = React.useMemo(() => {
    return props.evaluations
      .map((r) => r[0])
      .filter((n) => !props.filteredTopics.includes(n))
      .map((option, index) => <SelectOption key={index} value={option} />);
  }, [props.evaluations, props.filteredTopics]);

  return (
    <Select
      variant={SelectVariant.typeahead}
      onToggle={setIsExpanded}
      onSelect={onSelect}
      isOpen={isExpanded}
      typeAheadAriaLabel="Filter by topic..."
      placeholderText="Filter by topic..."
      aria-label="Filter by topic"
      maxHeight="16em"
      menuAppendTo={() => document.getElementById('dashboard-grid') || portalRoot}
    >
      {topicOptions}
    </Select>
  );
};
