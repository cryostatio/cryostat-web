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
import { AboutDescription, VERSION_REGEX } from '@app/About/AboutDescription';
import { ThemeSetting } from '@app/Settings/types';
import { defaultServices } from '@app/Shared/Services/Services';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { mockMediaQueryList, render, renderSnapshot } from '../utils';

jest.spyOn(defaultServices.settings, 'themeSetting').mockReturnValue(of(ThemeSetting.DARK));
jest.spyOn(defaultServices.settings, 'media').mockReturnValue(of(mockMediaQueryList));

const versionString = 'v1.2.3-snapshot';
jest.spyOn(defaultServices.api, 'cryostatVersion').mockReturnValue(of(versionString));
const commitHash = 'abcd1234';
jest.spyOn(defaultServices.api, 'buildInfo').mockReturnValue(of({ git: { hash: commitHash } }));

describe('<AboutDescription />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: { routes: [{ path: '/about', element: <AboutDescription /> }] },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('contains the correct information', async () => {
    render({
      routerConfigs: { routes: [{ path: '/about', element: <AboutDescription /> }] },
    });

    expect(screen.getByText(versionString)).toBeInTheDocument();
    expect(screen.getByText(versionString)).toHaveRole('link');
    expect(screen.getByText(versionString)).toHaveAttribute(
      'href',
      'https://github.com/cryostatio/cryostat/releases/tag/v1.2.3',
    );

    expect(screen.getByText(`commit ${commitHash}`)).toBeInTheDocument();
    expect(screen.getByText(`commit ${commitHash}`)).toHaveRole('link');
    expect(screen.getByText(`commit ${commitHash}`)).toHaveAttribute(
      'href',
      'https://github.com/cryostatio/cryostat/commit/abcd1234',
    );
  });

  const validVersions = [
    { str: 'v3.0.0', version: 'v3.0.0' },
    { str: 'v3.0.1', version: 'v3.0.1' },
    { str: 'v3.0.0-snapshot', version: 'v3.0.0', build: 'snapshot' },
    { str: '3.0.0', version: '3.0.0' },
    { str: '3.0.0-vendor123', version: '3.0.0', build: 'vendor123' },
    { str: 'v3.0.0-vendor123', version: 'v3.0.0', build: 'vendor123' },
    { str: 'v1.2.3-branch-vendor123', version: 'v1.2.3', build: 'branch-vendor123' },
    { str: 'v1.2.3-branch-vendor.tag123_a', version: 'v1.2.3', build: 'branch-vendor.tag123_a' },
    { str: 'v1.2.3-abcd1234', version: 'v1.2.3', build: 'abcd1234' },
  ];
  validVersions.forEach((version) => {
    it(`handles "${version.str}" version string correctly`, () => {
      expect(VERSION_REGEX.test(version.str)).toBeTruthy();
      const result = version.str.match(VERSION_REGEX);
      expect(result).toBeTruthy();
      expect(result![1]).toEqual(version.version);
      expect(result![2]).toEqual(version.build);
    });
  });

  const invalidVersions = ['v3', '3', '3.0', 'v3.0', 'v1.2.3abcd1234'];
  invalidVersions.forEach((str) => {
    it(`rejects "${str}" version string`, () => {
      expect(VERSION_REGEX.test(str)).toBeFalsy();
    });
  });
});
