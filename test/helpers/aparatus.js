import Server from '../../src/server';
import {connectToMongo} from '../../src/utils/db_utils';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import AccountRepository from '../../src/services/account_repository';
import DataObjectBuilder from '../../src/services/data_object_builder';
import DataModelEngine from '../../src/services/data_model_engine';
import chai from 'chai';
import chaiHttp from 'chai-http';

chai.use(chaiHttp);

export default class Aparatus {
  async start() {
    const {client, db} = await connectToMongo();
    this.client = client;
    this.db = db;
    const web3 = await createWeb3();

    const identityManager = new IdentityManager(web3);
    const objectBuilder = new DataObjectBuilder(identityManager);
    const accountRepository = new AccountRepository(db);
    const modelEngine = new DataModelEngine(objectBuilder, identityManager, accountRepository);

    this.server = new Server(db, identityManager, objectBuilder, modelEngine);
    this.server.start();
    return this;
  }

  request() {
    return chai.request(this.server.server);
  }

  async stop() {
    await this.server.stop();
    await this.client.close();
  }
}
