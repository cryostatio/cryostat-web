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
import {FormSelect, FormSelectOption, FormSelectOptionGroup} from '@patternfly/react-core';
import * as React from 'react';
import { EventTemplate, TemplateType } from '../CreateRecording/CreateRecording';
import { TemplateSelector } from './TemplateSelector';

export interface FormSelectTemplateSelectorProps {
  selected: string;
  templates: EventTemplate[];
  onChange: (specifier: string) => void;
}

export const FormSelectTemplateSelector: React.FunctionComponent<FormSelectTemplateSelectorProps> = (props) => {

  const [template, setTemplate] = React.useState(props.selected || undefined);

  const asSpecifier = (template: EventTemplate | undefined): string => {
    if (!template) {
      return ',';
    }
    return `${template.name},${template.type}`;
  };
  const [specifier, setSpecifier] = React.useState(props.selected || undefined);

  const handleTemplateChange = (specifier) => {
    const templateName = specifier.split(',')[0];
    const templateType = specifier.split(',')[1] as TemplateType;
    setSpecifier(specifier);
    setTemplate(
      asSpecifier(
        props.templates.find(template => template.name === templateName && template.type === templateType)
      )
    );
    props.onChange(specifier);
  };

  return (<>
    <FormSelect
      value={specifier}
      onChange={handleTemplateChange}
      aria-label="Event Template Input"
      id='recording-template'
    >
      <TemplateSelector
        placeholder={ <FormSelectOption key="-1" value="" label="Select a Template" isPlaceholder /> }
        templates={props.templates}
        templateMapper={(template: EventTemplate, idx: number, offset: number) =>
          <FormSelectOption key={idx+offset} value={`${template.name},${template.type}`} label={template.name} />
        }
        customGroup={children =>
          <FormSelectOptionGroup key="-2" label="Custom Templates">
            { children }
          </FormSelectOptionGroup>
        }
        targetGroup={children =>
          <FormSelectOptionGroup key="-3" label="Target Templates">
            { children }
          </FormSelectOptionGroup>
        }
      />
    </FormSelect>
  </>);

};
