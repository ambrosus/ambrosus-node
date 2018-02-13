export default class DataModelEngine {
  constructor(objectBuilder, identityManager, accountRepository) {
    this.objectBuilder = objectBuilder;
    this.identityManager = identityManager;
    this.accountRepository = accountRepository;
  }

  createAccount() {
    const account = this.identityManager.createKeyPair();
    this.accountRepository.store(account);
    return account;
  }
}
