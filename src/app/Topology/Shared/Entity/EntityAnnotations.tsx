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

export const EntityAnnotations: React.FC<{ annotations?: object; maxDisplay?: number }> = ({
  annotations,
  maxDisplay,
  ...props
}) => {
  const _transformedAnnotationGroups = React.useMemo(() => {
    return annotations
      ? Object.keys(annotations).map((groupK) => ({
          groupLabel: groupK,
          annotations: Object.keys(annotations[groupK]).map((k) => `${k}=${annotations[groupK][k]}`),
        }))
      : [];
  }, [annotations]);

  return _transformedAnnotationGroups.length ? (
    <div className="entity-overview__displayed-annotations-wrapper" {...props}>
      {_transformedAnnotationGroups.map((group) => (
        <div className="entity-overview__displayed-annotations" key={group.groupLabel}>
          <LabelGroup numLabels={maxDisplay} categoryName={group.groupLabel}>
            {group.annotations.map((a) => (
              <Label color="blue" key={a} isTruncated>
                {a}
              </Label>
            ))}
          </LabelGroup>
        </div>
      ))}
    </div>
  ) : (
    <EmptyText text="No annotations." />
  );
};
