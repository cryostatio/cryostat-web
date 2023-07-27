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

import cryostatLogo from '@app/assets/cryostat_logo_hori_rgb_default.svg';
import cryostatLogoDark from '@app/assets/cryostat_logo_hori_rgb_reverse.svg';
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import build from '@app/build.json';
import { ThemeSetting } from '@app/Settings/SettingsUtils';
import { useTheme } from '@app/utils/useTheme';
import { Brand, Card, CardBody, CardFooter, CardHeader } from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AboutDescription } from './AboutDescription';

export interface AboutProps {}

export const About: React.FC<AboutProps> = (_) => {
  const { t } = useTranslation('public');
  const [theme] = useTheme();

  const logo = React.useMemo(() => (theme === ThemeSetting.DARK ? cryostatLogoDark : cryostatLogo), [theme]);

  return (
    <BreadcrumbPage pageTitle={t('About.ABOUT')}>
      <Card>
        <CardHeader>
          <Brand alt={build.productName} src={logo} className="cryostat-logo" />
        </CardHeader>
        <CardBody>
          <AboutDescription />
        </CardBody>
        <CardFooter>{t('CRYOSTAT_TRADEMARK', { ns: 'common' })}</CardFooter>
      </Card>
    </BreadcrumbPage>
  );
};

export default About;
