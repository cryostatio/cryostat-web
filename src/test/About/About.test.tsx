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
import { About } from '@app/About/About';
import { ThemeSetting } from '@app/Settings/types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { mockMediaQueryList, render, renderSnapshot, testT } from '../utils';
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
    const tree = renderSnapshot({
      routerConfigs: { routes: [{ path: '/about', element: <About /> }] },
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('contains the correct information', async () => {
    render({
      routerConfigs: { routes: [{ path: '/about', element: <About /> }] },
    });

    expect(screen.getByText('About')).toBeInTheDocument();
    const logo = screen.getByRole('img');
    expect(logo).toHaveClass('pf-c-brand cryostat-logo');
    expect(logo).toHaveAttribute('alt', 'Cryostat');
    expect(logo).toHaveAttribute('src', 'test-file-stub');
    expect(screen.getByText(testT('CRYOSTAT_TRADEMARK', { ns: 'common' }))).toBeInTheDocument();
  });
});
