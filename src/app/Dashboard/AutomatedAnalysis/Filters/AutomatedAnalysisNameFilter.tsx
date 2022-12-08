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

import React from 'react';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import { RuleEvaluation } from '@app/Shared/Services/Report.service';

export interface AutomatedAnalysisNameFilterProps {
  evaluations: [string, RuleEvaluation[]][];
  filteredNames: string[];
  onSubmit: (inputName: string) => void;
}

export const AutomatedAnalysisNameFilter: React.FunctionComponent<AutomatedAnalysisNameFilterProps> = (props) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const onSelect = React.useCallback(
    (_, selection, isPlaceholder) => {
      if (!isPlaceholder) {
        setIsExpanded(false);
        props.onSubmit(selection);
      }
    },
    [props.onSubmit, setIsExpanded]
  );

  const nameOptions = React.useMemo(() => {
    const flatEvalMap: string[] = [] as string[];
    for (let topic of props.evaluations.map((r) => r[1])) {
      for (let rule of topic) {
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
    >
      {nameOptions}
    </Select>
  );
};
