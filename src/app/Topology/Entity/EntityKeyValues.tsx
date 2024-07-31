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
import { Label, LabelGroup } from '@patternfly/react-core';
import * as React from 'react';
import { EmptyText } from '../../Shared/Components/EmptyText';
import { valuesEntryTransformer } from './utils';

export interface EntityKeyValuesProps {
  kv?: string[] | object;
  maxDisplay?: number;
  transformer?: (o: object) => string[];
}

export const EntityKeyValues: React.FC<EntityKeyValuesProps> = ({
  kv,
  maxDisplay,
  transformer = valuesEntryTransformer,
  ...props
}) => {
  const _transformedKv = React.useMemo(() => (kv ? transformer(kv) : []), [kv, transformer]);
  return _transformedKv.length ? (
    <div className="entity-overview__displayed-keyvalues-wrapper" {...props}>
      <LabelGroup numLabels={maxDisplay}>
        {_transformedKv.map((l) => (
          <Label color="blue" key={l} textMaxWidth={'20ch'}>
            {l}
          </Label>
        ))}
      </LabelGroup>
    </div>
  ) : (
    <EmptyText text="No entries." />
  );
};
