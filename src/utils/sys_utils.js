/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {exec} from 'child_process';

const getGitCommitHash = async () => {
  const child = exec('git log -n1 --format=format:"%H"');

  return new Promise(((resolve, reject) => {
    child.stdout.on('data', (data) => {
      resolve(data.toString());
    });

    child.stderr.on('data', (data) => {
      reject(data.toString());
    });
  }));
};

export default getGitCommitHash;
