/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import chai from 'chai';
import ServerApparatus from '../helpers/server_apparatus';

const {expect} = chai;

describe('Prometheus middleware tests', () => {
  let apparatus;

  beforeEach(async () => {
    apparatus = new ServerApparatus();
    await apparatus.start();
  });

  afterEach(async () => {
    await apparatus.stop();
  });

  it('metrics endpoint', async () => {
    // Trigger a request which will add an entry of our request duration
    // histogram. /metrics and /health are excluded.
    await apparatus.request().get('/nodeInfo');

    const response = await apparatus.request().get('/metrics');
    expect(response.status).to.eql(200);

    // Built in library metrics
    expect(response.text.includes('process_cpu_user_seconds_total'))
      .to.eql(true);

    // Custom metrics
    expect(response.text.includes('http_request_duration_seconds_count 1'))
      .to.eql(true);

    expect(response.text.includes('http_requests_total{status="200"} 1'))
      .to.eql(true);
  });

  it('does not record health check requests', async () => {
    await apparatus.request().get('/health');

    const response = await apparatus.request().get('/metrics');
    expect(response.status).to.eql(200);

    expect(response.text.includes('http_request_duration_seconds_count 0'))
      .to.eql(true);

    expect(response.text.includes('http_requests_total{status="200"} 1'))
      .to.eql(false);
  });
});
