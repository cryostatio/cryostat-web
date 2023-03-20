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
import { useJoyride } from '@app/Joyride/JoyrideProvider';
import React from 'react';
import ReactJoyride, { CallBackProps, ACTIONS, EVENTS, STATUS } from 'react-joyride';
interface CryostatJoyrideProps {
  children: React.ReactNode;
}

const CryostatJoyride: React.FC<CryostatJoyrideProps> = (props) => {
  const {
    setState,
    state: { run, stepIndex, steps },
  } = useJoyride();

  React.useEffect(() => {
    console.log(run);
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
          target: document.getElementById('root') as HTMLElement,
        },
        {
          content: <div> hello </div>,
          target: '#settings-button',
        },
        {
          content: (
            <div>
              <h2>Dashboard Card Actions</h2>
              <p>
                Cards can be added, removed, resized, and re-ordered. The cards can be configured to display different
                metrics and charts.
              </p>
            </div>
          ),
          placement: 'top',
          target: 'body',
        },
        {
          content: (
            <div>
              <h2>Dashboard Card Configuration</h2>
              <p>The dashboard can be customized by selecting the "Edit Dashboard" button in the top right corner.</p>
              <p>
                The dashboard is composed of cards, which can be added, removed, resized, and re-ordered. The cards can
                be configured to display different metrics and charts.
              </p>
            </div>
          ),
          placement: 'top',
          target: 'body',
        },
      ],
    });
  }, [setState]);

  const callback = React.useCallback(
    (data: CallBackProps) => {
      console.log('callback', data);
      const { action, index, lifecycle, type } = data;
      if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
        setState({ run: false });
      } else if (action === 'close' && type === 'step:before') {
        setState({ run: false });
      } else if (([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND] as string[]).includes(type)) {
        const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);

        setState({ stepIndex: nextStepIndex });
      }
    },
    [setState]
  );

  return (
    <>
      <ReactJoyride
        debug={true}
        callback={callback}
        continuous={true}
        run={run}
        showSkipButton={true}
        stepIndex={stepIndex}
        steps={steps}
        styles={{
          options: {
            arrowColor: '#fff',
            backgroundColor: '#fff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            primaryColor: 'var(--cryostat-indigo)',
            textColor: '#000',
            width: 500,
          },
        }}
      />
      {props.children}
    </>
  );
};

export default CryostatJoyride;
