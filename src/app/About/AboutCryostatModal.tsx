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
import bkgImg from '@app/assets/about_background.png';
import cryostatLogo from '@app/assets/cryostat_icon_rgb_reverse.svg';
import build from '@app/build.json';
import { portalRoot } from '@app/utils/utils';
import { AboutModal } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AboutDescription } from './AboutDescription';

export interface AboutCryostatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutCryostatModal: React.FC<AboutCryostatModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  return (
    <AboutModal
      appendTo={portalRoot}
      productName={`${build.productName} ${build.version}`}
      brandImageSrc={cryostatLogo}
      brandImageAlt="Cryostat Logo"
      isOpen={isOpen}
      onClose={onClose}
      trademark={t('CRYOSTAT_TRADEMARK', { ns: 'common' })}
      backgroundImageSrc={bkgImg}
    >
      <AboutDescription />
    </AboutModal>
  );
};
