export default class DataModelEngine {
  constructor(objectBuilder, identityManager, accountStorage) {
    this.objectBuilder = objectBuilder;
    this.identityManager = identityManager;
    this.accountStorage = accountStorage;
  }

  createAccount() {
    const account = this.identityManager.createKeyPair();
    this.accountStorage.store(account);
    return account;
  }
}
