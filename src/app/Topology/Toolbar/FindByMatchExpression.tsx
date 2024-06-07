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
import { useMatchExpressionSvc } from '@app/utils/hooks/useMatchExpressionSvc';
import { SearchInput } from '@patternfly/react-core';
import * as React from 'react';

export interface FindByMatchExpressionProps {
  isDisabled?: boolean;
}

export const FindByMatchExpression: React.FC<FindByMatchExpressionProps> = ({ isDisabled, ...props }) => {
  const matchExprService = useMatchExpressionSvc();
  const [expression, setExpression] = React.useState('');

  return (
    <SearchInput
      {...props}
      placeholder={'Find by Match Expression...'}
      value={expression}
      onChange={(_, input) => {
        setExpression(input);
        matchExprService.setSearchExpression(input);
      }}
      isDisabled={isDisabled}
    />
  );
};
