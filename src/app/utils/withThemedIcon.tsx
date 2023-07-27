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
import { ThemeSetting } from '@app/Settings/SettingsUtils';
import { useTheme } from '@app/utils/useTheme';
import React from 'react';

export const withThemedIcon = (icon: string, darkIcon: string, alt: string): React.FC => {
  const WithThemedIcon: React.FC = () => {
    const [theme] = useTheme();
    if (theme === ThemeSetting.DARK) {
      return <img src={darkIcon} alt={alt} />;
    } else {
      return <img src={icon} alt={alt} />;
    }
  };
  return WithThemedIcon;
};
