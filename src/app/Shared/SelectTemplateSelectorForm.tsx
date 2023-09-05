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
//
import { EventTemplate } from '@app/CreateRecording/CreateRecording';
import { TemplateType } from '@app/Shared/Services/Api.service';
import { FormSelect, FormSelectOption, FormSelectOptionGroup, ValidatedOptions } from '@patternfly/react-core';
import * as React from 'react';

export interface TemplateSelectionGroup {
  groupLabel: string;
  disabled?: boolean;
  options: {
    value: string;
    label: string;
    disabled?: boolean;
  }[];
}

export interface SelectTemplateSelectorFormProps {
  selected: string; // e.g. "Continuous,TARGET"
  templates: EventTemplate[];
  disabled?: boolean;
  validated?: ValidatedOptions;
  onSelect: (template?: string, templateType?: TemplateType) => void;
}

export const SelectTemplateSelectorForm: React.FC<SelectTemplateSelectorFormProps> = ({
  selected,
  templates,
  disabled,
  validated,
  onSelect,
}) => {
  const groups = React.useMemo(
    () =>
      [
        {
          groupLabel: 'Target Templates',
          options: templates
            .filter((t) => t.type === 'TARGET')
            .map((t) => ({
              value: `${t.name},${t.type}`,
              label: t.name,
            })),
        },
        {
          groupLabel: 'Custom Templates',
          options: templates
            .filter((t) => t.type === 'CUSTOM')
            .map((t) => ({
              value: `${t.name},${t.type}`,
              label: t.name,
            })),
        },
      ] as TemplateSelectionGroup[],
    [templates],
  );

  const handleTemplateSelect = React.useCallback(
    (selected: string) => {
      if (!selected.length) {
        onSelect(undefined, undefined);
      } else {
        const str = selected.split(',');
        onSelect(str[0], str[1] as TemplateType);
      }
    },
    [onSelect],
  );

  return (
    <>
      <FormSelect
        isDisabled={disabled}
        value={selected}
        validated={validated || ValidatedOptions.default}
        onChange={handleTemplateSelect}
        aria-label="Event Template Input"
        id="recording-template"
        data-quickstart-id="template-selector"
      >
        <FormSelectOption key="-1" value="" label="Select a Template" isPlaceholder />
        {groups.map((group, index) => (
          <FormSelectOptionGroup isDisabled={group.disabled} key={index} label={group.groupLabel}>
            {group.options.map((option, idx) => (
              <FormSelectOption key={idx} label={option.label} value={option.value} isDisabled={option.disabled} />
            ))}
          </FormSelectOptionGroup>
        ))}
      </FormSelect>
    </>
  );
};
