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
import i18n from '@app/../i18n/config';
import { About } from '@app/About/About';
import { ThemeSetting } from '@app/Settings/types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import renderer, { act } from 'react-test-renderer';
import { of } from 'rxjs';
import { mockMediaQueryList, renderDefault, testT } from '../Common';
jest.mock('@app/BreadcrumbPage/BreadcrumbPage', () => {
  return {
    BreadcrumbPage: jest.fn((props) => {
      return (
        <div>
          {props.pageTitle}
          {props.children}
        </div>
      );
    }),
  };
});

jest.spyOn(defaultServices.settings, 'themeSetting').mockReturnValue(of(ThemeSetting.DARK));
jest.spyOn(defaultServices.settings, 'media').mockReturnValue(of(mockMediaQueryList));

jest.mock('@app/About/AboutDescription', () => {
  return {
    ...jest.requireActual('@app/About/AboutDescription'),
    AboutDescription: jest.fn(() => {
      return <div>AboutDescription</div>;
    }),
  };
});

describe('<About />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(<About />);
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('contains the correct information', async () => {
    renderDefault(
      <I18nextProvider i18n={i18n}>
        <About />
      </I18nextProvider>,
    );

    expect(screen.getByText('About')).toBeInTheDocument();
    const logo = screen.getByRole('img');
    expect(logo).toHaveClass('pf-c-brand cryostat-logo');
    expect(logo).toHaveAttribute('alt', 'Cryostat');
    expect(logo).toHaveAttribute('src', 'test-file-stub');
    expect(screen.getByText(testT('CRYOSTAT_TRADEMARK', { ns: 'common' }))).toBeInTheDocument();
  });
});
