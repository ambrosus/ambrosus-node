/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import chai from 'chai';
import Apparatus from '../helpers/apparatus';

const {expect} = chai;

describe('Prometheus middleware tests', () => {
  let apparatus;

  beforeEach(async () => {
    apparatus = new Apparatus();
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
    expect(response.text.indexOf('process_cpu_user_seconds_total') > -1)
      .to.eql(true);

    // Custom metrics
    expect(response.text.indexOf(
      'http_request_duration_seconds_count{status="200"} 1'
    ) > -1)
      .to.eql(true);
  });
});
