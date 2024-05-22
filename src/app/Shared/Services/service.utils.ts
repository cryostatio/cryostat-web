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

import * as React from 'react';
import { BehaviorSubject } from 'rxjs';
import { automatedAnalysisRecordingName, RecordingAttributes, Target } from './api.types';
import { MatchExpressionService } from './MatchExpression.service';
import { AutomatedAnalysisRecordingConfig, ChartControllerConfig } from './service.types';

// ======================================
// Match expression
// ======================================
export const SearchExprServiceContext = React.createContext(new MatchExpressionService());

export const MatchedTargetsServiceContext = React.createContext(new BehaviorSubject<Target[] | undefined>(undefined));

// ======================================
// Setting
// ======================================
export const defaultChartControllerConfig: ChartControllerConfig = {
  minRefresh: 10,
};

export const automatedAnalysisConfigToRecordingAttributes = (
  config: AutomatedAnalysisRecordingConfig,
): RecordingAttributes => {
  return {
    name: automatedAnalysisRecordingName,
    events: `template=${config.template.name},type=${config.template.type}`,
    duration: undefined,
    archiveOnStop: false,
    advancedOptions: {
      toDisk: true,
      maxAge: config.maxAge,
      maxSize: config.maxSize,
    },
    metadata: {
      labels: [
        {
          key: 'origin',
          value: automatedAnalysisRecordingName,
        },
      ],
    },
  };
};
