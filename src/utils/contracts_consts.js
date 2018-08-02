/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ApolloDepositStoreJson from '../../contracts/ApolloDepositStore.json';
import AtlasStakeStoreJson from '../../contracts/AtlasStakeStore.json';
import BundleStoreJson from '../../contracts/BundleStore.json';
import ChallengesJson from '../../contracts/Challenges.json';
import ConfigJson from '../../contracts/Config.json';
import FeesJson from '../../contracts/Fees.json';
import KycWhitelistJson from '../../contracts/KycWhitelist.json';
import PayoutsJson from '../../contracts/Payouts.json';
import PayoutsStoreJson from '../../contracts/PayoutsStore.json';
import RolesJson from '../../contracts/Roles.json';
import RolesStoreJson from '../../contracts/RolesStore.json';
import ShelteringJson from '../../contracts/Sheltering.json';
import ShelteringTransfersJson from '../../contracts/ShelteringTransfers.json';
import TimeJson from '../../contracts/Time.json';
import UploadsJson from '../../contracts/Uploads.json';
import ContextJson from '../../contracts/Context.json';
import HeadJson from '../../contracts/Head.json';
import SafeMathExtensionsJson from '../../contracts/SafeMathExtensions.json';

const contractsJsons = {
  time: TimeJson,
  atlasStakeStore: AtlasStakeStoreJson,
  roles: RolesJson,
  bundleStore: BundleStoreJson,
  kycWhitelist: KycWhitelistJson,
  sheltering: ShelteringJson,
  fees: FeesJson,
  challenges: ChallengesJson,
  payoutsStore: PayoutsStoreJson,
  payouts: PayoutsJson,
  shelteringTransfers: ShelteringTransfersJson,
  config: ConfigJson,
  uploads: UploadsJson,
  rolesStore: RolesStoreJson,
  apolloDepositStore: ApolloDepositStoreJson
};

const serviceContractsJsons = {
  head: HeadJson,
  context: ContextJson,
  safeMathExtensions: SafeMathExtensionsJson
};

export {contractsJsons, serviceContractsJsons};
