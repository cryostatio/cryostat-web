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

import build from '@app/build.json';
import { BuildInfo } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Content, ContentVariants } from '@patternfly/react-core';
import * as React from 'react';

export const VERSION_REGEX = /^(v?[0-9]+\.[0-9]+\.[0-9]+)(?:[-_\.](.+))?$/;

export const AboutDescription: React.FC = () => {
  const serviceContext = React.useContext(ServiceContext);
  const notificationsContext = React.useContext(NotificationsContext);
  const [cryostatVersion, setCryostatVersion] = React.useState(undefined as string | undefined);
  const [buildInfo, setBuildInfo] = React.useState<BuildInfo>({ git: { hash: '' } });
  const { t } = useCryostatTranslation();
  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    addSubscription(serviceContext.api.cryostatVersion().subscribe(setCryostatVersion));
    addSubscription(serviceContext.api.buildInfo().subscribe(setBuildInfo));
  }, [addSubscription, serviceContext]);

  const cryostatReleaseTag = React.useMemo(() => {
    if (!cryostatVersion) {
      return;
    }
    const result = cryostatVersion.match(VERSION_REGEX);
    if (!result) {
      notificationsContext.warning(
        'Cryostat version parse failure',
        `Could not parse Cryostat version string '${cryostatVersion}'.`,
      );
      return;
    }
    return result[1];
  }, [cryostatVersion, notificationsContext]);

  const versionComponent = React.useMemo(() => {
    if (build.releaseTagUrl) {
      return (
        <Content
          component={ContentVariants.a}
          target="_blank"
          href={
            cryostatReleaseTag
              ? build.releaseTagUrl.replace('__REPLACE_HASH__', cryostatReleaseTag)
              : build.developmentUrl
          }
        >
          {cryostatVersion}
        </Content>
      );
    } else {
      return <Content component={ContentVariants.p}>{cryostatVersion}</Content>;
    }
  }, [cryostatVersion, cryostatReleaseTag]);

  const buildInfoComponent = React.useMemo(() => {
    if (build.commitUrl) {
      return (
        <Content
          component={ContentVariants.a}
          target="_blank"
          href={build.commitUrl.replace('__REPLACE_HASH__', buildInfo.git.hash)}
        >
          {t('AboutDescription.COMMIT', { hash: buildInfo.git.hash })}
        </Content>
      );
    } else {
      return (
        <Content component={ContentVariants.p}>{t('AboutDescription.COMMIT', { hash: buildInfo.git.hash })}</Content>
      );
    }
  }, [t, buildInfo]);

  return (
    <>
      <Content>
        <Content component="dl">
          <Content component="dt">{t('AboutDescription.VERSION')}</Content>
          <Content component="dd">{versionComponent}</Content>
          <Content component="dt">{t('AboutDescription.BUILD_INFO')}</Content>
          <Content component="dd">{buildInfoComponent}</Content>
          <Content component="dt">{t('AboutDescription.HOMEPAGE')}</Content>
          <Content component="dd">
            <Content component={ContentVariants.a} target="_blank" href={build.homePageUrl}>
              cryostat.io
            </Content>
          </Content>
          <Content component="dt">{t('AboutDescription.BUGS')}</Content>
          <Content component="dd">
            <Content component="p">
              <Content component={ContentVariants.a} target="_blank" href={build.knownIssuesUrl}>
                {t('AboutDescription.KNOWN_ISSUES')}
              </Content>
              &nbsp;|&nbsp;
              <Content
                component={ContentVariants.a}
                target="_blank"
                href={build.fileIssueUrl.replace('__REPLACE_VERSION__', cryostatVersion || 'unknown')}
              >
                {t('AboutDescription.FILE_A_REPORT')}
              </Content>
            </Content>
          </Content>
          <Content component="dt">{t('AboutDescription.MAILING_LIST')}</Content>
          <Content component="dd">
            <Content component={ContentVariants.a} target="_blank" href={build.mailingListUrl}>
              {build.mailingListName}
            </Content>
          </Content>
          <Content component="dt">{t('AboutDescription.OPEN_SOURCE_LICENSE')}</Content>
          <Content component="dd">
            <Content component={ContentVariants.a} target="_blank" href={build.licenseUrl}>
              {t('AboutDescription.LICENSE')}
            </Content>
          </Content>
        </Content>
      </Content>
    </>
  );
};
