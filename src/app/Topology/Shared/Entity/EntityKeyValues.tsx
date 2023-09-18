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
import { EmptyText } from '../EmptyText';

export function keyValueEntryTransformer(kv: string[] | object): string[] {
  return kv ? Object.keys(kv).map((k) => `${k}=${kv[k]}`) : [];
}

export function valuesEntryTransformer(kv: string[] | object): string[] {
  return kv ? Object.keys(kv).map((k) => `${kv[k]}`) : [];
}

export const EntityKeyValues: React.FC<{
  kv: string[] | object;
  maxDisplay?: number;
  transformer?: (o: object) => string[];
}> = ({ kv, maxDisplay, transformer = valuesEntryTransformer, ...props }) => {
  const _transformedKv = React.useMemo(() => transformer(kv), [kv, transformer]);
  return _transformedKv.length ? (
    <div className="entity-overview__displayed-keyvalues-wrapper" {...props}>
      <LabelGroup numLabels={maxDisplay}>
        {_transformedKv.map((l) => (
          <Label color="blue" key={l} isTruncated>
            {l}
          </Label>
        ))}
      </LabelGroup>
    </div>
  ) : (
    <EmptyText text="No entries." />
  );
};
