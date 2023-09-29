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
import { AnalysisResult } from '@app/Shared/Services/api.types';
import { Stack, StackItem, Title, Label, Text } from '@patternfly/react-core';
import _ from 'lodash';
import * as React from 'react';

export const transformAADescription = (result: AnalysisResult): JSX.Element => {
  const format = (s): JSX.Element => {
    if (typeof s === 'string') {
      return <Text>{s}</Text>;
    }
    if (Array.isArray(s)) {
      return (
        <Stack>
          {s.map((e) => (
            <StackItem key={e.setting}>
              <Title headingLevel={'h6'}>{e.setting}</Title>
              <Label>
                {e.name}={e.value}
              </Label>
            </StackItem>
          ))}
        </Stack>
      );
    }
    throw `Unrecognized item: ${s}`;
  };
  return (
    <div>
      {Object.entries(result.evaluation || {}).map(([k, v]) =>
        v && v.length ? (
          <div key={k}>
            <span>
              <Title headingLevel={'h5'}>{_.capitalize(k)}</Title>
              {format(result.evaluation[k])}
            </span>
            <br />
          </div>
        ) : (
          <div key={k}></div>
        ),
      )}
    </div>
  );
};
