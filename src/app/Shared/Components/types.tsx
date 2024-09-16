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

import { MultipleFileUploadProps } from '@patternfly/react-core';
import * as React from 'react';

export interface LoadingProps {
  spinnerAriaValueText?: string; // Text describing that current loading status or progress
  spinnerAriaLabelledBy?: string; // Id of element which describes what is being loaded
  spinnerAriaLabel?: string; // Accessible label for the spinner to describe what is loading
  isLoading: boolean;
}

export type DescriptionProps = {
  children?: React.ReactNode;
};

export type Unpacked<T> = T extends (infer A)[] ? A : T;

// FIXME: React drop-zone types cannot be imported
export type DropzoneOptions = NonNullable<MultipleFileUploadProps['dropzoneProps']>;

export type FileRejection = Unpacked<Parameters<NonNullable<DropzoneOptions['onDropRejected']>>[0]>;

export type DropzoneAccept = DropzoneOptions['accept'];
