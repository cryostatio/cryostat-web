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

import { AutomatedAnalysisScoreFilter } from '@app/Dashboard/AutomatedAnalysis/Filters/AutomatedAnalysisScoreFilter';

import { RootState } from '@app/Shared/Redux/ReduxStore';
import { cleanup, screen } from '@testing-library/react';
import React from 'react';
import { basePreloadedState, renderWithReduxStore } from '../../../Common';

const onlyShowingText = (value: number) => `Only showing analysis results with severity scores ≥ ${value}:`;

describe('<AutomatedAnalysisScoreFilter />', () => {
  let preloadedState: RootState;

  beforeEach(() => {
    preloadedState = {
      ...basePreloadedState,
      automatedAnalysisFilters: {
        targetFilters: [],
        globalFilters: {
          filters: {
            Score: 100,
          },
        },
        _version: '0',
      },
    };
  });

  afterEach(cleanup);

  it('resets to 0 and 100 when clicking reset buttons', async () => {
    const { user } = renderWithReduxStore(<AutomatedAnalysisScoreFilter />, {
      preloadState: preloadedState,
    });
    const resetTo0Button = screen.getByRole('button', {
      name: /reset score to 0/i,
    });
    const resetTo100Button = screen.getByRole('button', {
      name: /reset score to 100/i,
    });
    const sliderValue = screen.getByRole('spinbutton', {
      name: /slider value input/i,
    });

    expect(sliderValue).toHaveValue(100);

    await user.click(resetTo0Button);
    expect(sliderValue).toHaveValue(0);

    await user.click(resetTo100Button);
    expect(sliderValue).toHaveValue(100);
  });

  it('responds to score filter changes', async () => {
    const { user } = renderWithReduxStore(<AutomatedAnalysisScoreFilter />, {
      preloadState: preloadedState,
    });
    const sliderValue = screen.getByRole('spinbutton', {
      name: /slider value input/i,
    });

    expect(sliderValue).toHaveValue(100);
    expect(
      document.getElementsByClassName('automated-analysis-score-filter-slider-critical').item(0)
    ).toBeInTheDocument();
    expect(screen.getByText(onlyShowingText(100))).toBeInTheDocument();

    await user.clear(sliderValue);
    await user.keyboard('{Enter}');
    expect(sliderValue).toHaveValue(0);
    expect(document.getElementsByClassName('automated-analysis-score-filter-slider-ok').item(0)).toBeInTheDocument();
    expect(screen.getByText(onlyShowingText(0))).toBeInTheDocument();

    await user.type(sliderValue, '50');
    await user.keyboard('{Enter}');
    expect(sliderValue).toHaveValue(50);
    expect(
      document.getElementsByClassName('automated-analysis-score-filter-slider-warning').item(0)
    ).toBeInTheDocument();
    expect(screen.getByText(onlyShowingText(50))).toBeInTheDocument();

    await user.type(sliderValue, '500');
    await user.keyboard('{Enter}');
    expect(sliderValue).toHaveValue(100);
    expect(
      document.getElementsByClassName('automated-analysis-score-filter-slider-critical').item(0)
    ).toBeInTheDocument();
    expect(screen.getByText(onlyShowingText(100))).toBeInTheDocument();
  });
});
