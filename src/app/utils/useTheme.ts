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
import { ThemeSetting, ThemeType } from '@app/Settings/SettingsUtils';
import { ServiceContext } from '@app/Shared/Services/Services';
import * as React from 'react';
import { Subscription } from 'rxjs';

// setting is the option, but theme is the color scheme what we actually render
export function useTheme(): [ThemeType, ThemeSetting] {
  const [setting, setSetting] = React.useState<ThemeSetting>(ThemeSetting.LIGHT);
  const [theme, setTheme] = React.useState<ThemeType>(ThemeSetting.LIGHT);
  const themeRef = React.useRef<Subscription>();
  const mediaRef = React.useRef<Subscription>();
  const services = React.useContext(ServiceContext);

  React.useEffect(() => {
    themeRef.current = services.settings.themeSetting().subscribe((theme) => {
      setSetting(theme);
      if (theme === ThemeSetting.AUTO) {
        setTheme(
          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? ThemeSetting.DARK
            : ThemeSetting.LIGHT
        );
      } else {
        setTheme(theme);
      }
    });
    return () => themeRef.current && themeRef.current.unsubscribe();
  }, [services.settings, themeRef]);

  React.useEffect(() => {
    mediaRef.current = services.settings.media('(prefers-color-scheme: dark)').subscribe((dark) => {
      setSetting((setting) => {
        if (setting === ThemeSetting.AUTO) {
          setTheme(dark.matches ? ThemeSetting.DARK : ThemeSetting.LIGHT);
        }
        return setting;
      });
    });
    return () => mediaRef.current && mediaRef.current.unsubscribe();
  }, [services.settings, mediaRef]);

  return [theme, setting];
}
