/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import cryostatLogo from '@app/assets/cryostat_logo_vert_rgb_default.svg';
import build from '@app/build.json';
import { useJoyride } from '@app/Joyride/JoyrideProvider';
import JoyrideTooltip from '@app/Joyride/JoyrideTooltip';
import React from 'react';
import ReactJoyride, { CallBackProps, ACTIONS, EVENTS, STATUS } from 'react-joyride';
interface CryostatJoyrideProps {
  children: React.ReactNode;
}

const CryostatJoyride: React.FC<CryostatJoyrideProps> = (props) => {
  const {
    setState,
    state: { run, stepIndex, steps },
    isNavBarOpen,
  } = useJoyride();

  React.useEffect(() => {
    setState({
      steps: [
        {
          content: (
            <div>
              <p>
                <strong>Cryostat</strong> is a cloud-based profiling application for managing JFR recordings in
                containerized Java environments.
              </p>
              <br />
              <p>
                There are many other features that <strong>Cryostat</strong> provides, such as the ability to download
                recordings, generate reports, and more.
              </p>
            </div>
          ),
          placement: 'center',
          title: (
            <div style={{ padding: '1em' }}>
              <img src={cryostatLogo} alt="Cryostat Logo" style={{ paddingBottom: '1em' }} height={300} width={300} />
              <h1>
                Welcome to <strong>Cryostat</strong>!
              </h1>
            </div>
          ),
          target: 'body',
          disableBeacon: true,
        },
        {
          content: <p>Open the navigation bar!</p>,
          target: '*[data-tour-id="nav-toggle-btn"]',
          disableBeacon: true,
          placement: 'bottom',
          spotlightClicks: true,
          placementBeacon: 'right',
        },
        {
          title: 'Dashboard View',
          content: (
            <div>
              <p>
                The <strong>Dashboard</strong> provides a high-level overview of Cryostat and the target JVM with the
                use of <strong>Dashboard Cards</strong>.
              </p>
              <br />
              <p>There are various dashboard cards that can be configured to display different metrics and charts.</p>
            </div>
          ),
          target: '*[data-tour-id="dashboard"]',
          placement: 'right',
        },
        {
          title: 'Topology View',
          content: (
            <div>
              <p>
                The <strong>Topology</strong> view provides a visual representation of Cryostat and the deployment
                model. Start, stop, and delete recordings on multiple targets at a time from this view.
              </p>
            </div>
          ),
          target: '*[data-tour-id="topology"]',
          placement: 'right',
        },
        {
          title: 'Automated Rules',
          content: (
            <p>
              Create, delete, enable, and view Cryostat <strong>Automated Rules</strong> in this view. Automated Rules
              allow you start recordings on target JVMs based on a set of conditions.
            </p>
          ),
          target: '*[data-tour-id="automatedrules"]',
          placement: 'right',
        },
        {
          title: 'JFR Recordings',
          content: (
            <p>
              The <strong>Recordings</strong> view provides a list of all active recordings that are currently being
              recorded on the target JVM. Start, stop, download, delete recordings from this view.
            </p>
          ),
          target: '*[data-tour-id="recordings"]',
          placement: 'right',
        },
        {
          title: 'Archives View',
          content: (
            <p>
              The <strong>Archives</strong> view provides a list of all saved recordings that have been saved to
              Cryostat. Download, delete, and generate reports from this view.
            </p>
          ),
          target: '*[data-tour-id="archives"]',
          placement: 'right',
        },
        {
          title: 'Events',
          content: (
            <p>
              The <strong>Events</strong> page lists the <strong>Event Templates</strong> that can be used for creating
              Flight Recordings. It also details the JFR <strong>Event Types</strong> that can be recorded within each
              target JVM.
            </p>
          ),
          target: '*[data-tour-id="events"]',
          placement: 'right',
        },
        {
          title: 'Security',
          content: (
            <p>
              The <strong>Security</strong> tab allows you to add <strong>Credentials</strong> and{' '}
              <strong>SSL Certificates</strong> for Cryostat to use when connecting to remote targets.
            </p>
          ),
          target: '*[data-tour-id="security"]',
          placement: 'right',
        },
        {
          title: 'Settings',
          content: (
            <p>
              Set your <strong>Cryostat preferences</strong>, such as the theme, locale, notification settings, and
              more.
            </p>
          ),
          target: '*[data-tour-id="settings-link"]',
        },
        {
          title: 'Help',
          content: (
            <p>
              Restart this tour or access our new <strong>quick starts</strong> where you can learn more about using
              Cryostat in your environment.
            </p>
          ),
          target: '*[data-tour-id="application-launcher"]',
        },
        {
          title: 'You’re ready to go!',
          content: (
            <p>
              Stay up-to-date with everything Cryostat on our{' '}
              <a target="_blank" href={`${build.homePageUrl}/blog/`} rel="noreferrer">
                blog
              </a>{' '}
              or continue to learn more in our{' '}
              <a target="_blank" href={`${build.homePageUrl}/guides/`} rel="noreferrer">
                documentation guides
              </a>
              .
            </p>
          ),
          placement: 'center',
          target: 'body',
          disableBeacon: true,
        },
      ],
    });
  }, [setState]);

  // index 0 -> Get Started
  // index 1 -> Navigation
  // index 2 -> Dashboard
  // etc...
  const callback = React.useCallback(
    (data: CallBackProps) => {
      const { action, index, status, type } = data;
      if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
        setState({ run: false, stepIndex: 0 });
      } else if (action === 'close' && type === 'step:before') {
        setState({ run: false, stepIndex: 0 });
      } else if (([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND] as string[]).includes(type)) {
        if (action === ACTIONS.PREV) {
          switch (index) {
            case 0:
            case 2:
              setState({ stepIndex: 0 });
              break;
            default:
              setState({ stepIndex: index - 1 });
          }
        } else {
          switch (index) {
            case 0:
              if (isNavBarOpen) {
                setState({ stepIndex: 2 });
              } else {
                setState({ stepIndex: 1 });
              }
              break;
            default:
              setState({ stepIndex: index + 1 });
          }
        }
      }
    },
    [setState, isNavBarOpen]
  );

  return (
    <>
      <ReactJoyride
        tooltipComponent={JoyrideTooltip}
        debug={true}
        callback={callback}
        continuous
        run={run}
        stepIndex={stepIndex}
        steps={steps}
        disableOverlayClose
        disableCloseOnEsc
        spotlightPadding={0}
      />
      {props.children}
    </>
  );
};

export default CryostatJoyride;
