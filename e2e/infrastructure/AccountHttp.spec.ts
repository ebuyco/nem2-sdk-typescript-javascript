/*
 * Copyright 2018 NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { assert, expect } from 'chai';
import { AccountRepository } from '../../src/infrastructure/AccountRepository';
import { MultisigRepository } from '../../src/infrastructure/MultisigRepository';
import { NamespaceRepository } from '../../src/infrastructure/NamespaceRepository';
import { QueryParams } from '../../src/infrastructure/QueryParams';
import { Account } from '../../src/model/account/Account';
import { Address } from '../../src/model/account/Address';
import { PublicAccount } from '../../src/model/account/PublicAccount';
import { NetworkType } from '../../src/model/blockchain/NetworkType';
import { PlainMessage } from '../../src/model/message/PlainMessage';
import { NetworkCurrencyMosaic } from '../../src/model/mosaic/NetworkCurrencyMosaic';
import { AliasAction } from '../../src/model/namespace/AliasAction';
import { NamespaceId } from '../../src/model/namespace/NamespaceId';
import { AddressAliasTransaction } from '../../src/model/transaction/AddressAliasTransaction';
import { AggregateTransaction } from '../../src/model/transaction/AggregateTransaction';
import { Deadline } from '../../src/model/transaction/Deadline';
import { MultisigAccountModificationTransaction } from '../../src/model/transaction/MultisigAccountModificationTransaction';
import { NamespaceRegistrationTransaction } from '../../src/model/transaction/NamespaceRegistrationTransaction';
import { TransactionType } from '../../src/model/transaction/TransactionType';
import { TransferTransaction } from '../../src/model/transaction/TransferTransaction';
import { UInt64 } from '../../src/model/UInt64';
import { IntegrationTestHelper } from './IntegrationTestHelper';

describe('AccountHttp', () => {
    const helper = new IntegrationTestHelper();
    let account: Account;
    let account2: Account;
    let multisigAccount: Account;
    let cosignAccount1: Account;
    let cosignAccount2: Account;
    let cosignAccount3: Account;
    let accountAddress: Address;
    let accountPublicKey: string;
    let publicAccount: PublicAccount;
    let accountRepository: AccountRepository;
    let multisigRepository: MultisigRepository;
    let namespaceRepository: NamespaceRepository;
    let namespaceId: NamespaceId;
    let generationHash: string;
    let networkType: NetworkType;

    before(() => {
        return helper.start().then(() => {
            account = helper.account;
            account2 = helper.account2;
            multisigAccount = helper.multisigAccount;
            cosignAccount1 = helper.cosignAccount1;
            cosignAccount2 = helper.cosignAccount2;
            cosignAccount3 = helper.cosignAccount3;
            accountAddress = helper.account.address;
            accountPublicKey = helper.account.publicKey;
            publicAccount = helper.account.publicAccount;
            generationHash = helper.generationHash;
            networkType = helper.networkType;
            accountRepository = helper.repositoryFactory.createAccountRepository();
            multisigRepository = helper.repositoryFactory.createMultisigRepository();
            namespaceRepository = helper.repositoryFactory.createNamespaceRepository();
        });
    });
    before(() => {
        return helper.listener.open();
    });

    after(() => {
        helper.listener.close();
    });

    /**
     * =========================
     * Setup test data
     * =========================
     */

    describe('Make sure test account is not virgin', () => {
        it('Announce TransferTransaction', () => {
            const transferTransaction = TransferTransaction.create(
                Deadline.create(),
                account2.address,
                [NetworkCurrencyMosaic.createAbsolute(1)],
                PlainMessage.create('test-message'),
                networkType,
                helper.maxFee,
            );

            const signedTransaction = transferTransaction.signWith(account, generationHash);
            return helper.announce(signedTransaction);
        });
    });

    describe('Setup test NamespaceId', () => {
        it('Announce NamespaceRegistrationTransaction', () => {
            const namespaceName = 'root-test-namespace-' + Math.floor(Math.random() * 10000);
            const registerNamespaceTransaction = NamespaceRegistrationTransaction.createRootNamespace(
                Deadline.create(),
                namespaceName,
                UInt64.fromUint(9),
                networkType,
                helper.maxFee,
            );
            namespaceId = new NamespaceId(namespaceName);
            const signedTransaction = registerNamespaceTransaction.signWith(account, generationHash);
            return helper.announce(signedTransaction);
        });
    });

    describe('Setup test AddressAlias', () => {

        it('Announce addressAliasTransaction', () => {
            const addressAliasTransaction = AddressAliasTransaction.create(
                Deadline.create(),
                AliasAction.Link,
                namespaceId,
                account.address,
                networkType,
                helper.maxFee,
            );
            const signedTransaction = addressAliasTransaction.signWith(account, generationHash);
            return helper.announce(signedTransaction);
        });
    });

    describe('Setup test multisig account', () => {

        it('Announce MultisigAccountModificationTransaction', () => {
            const modifyMultisigAccountTransaction = MultisigAccountModificationTransaction.create(
                Deadline.create(),
                2,
                1,
                [
                    cosignAccount1.publicAccount,
                    cosignAccount2.publicAccount,
                    cosignAccount3.publicAccount,
                ],
                [],
                networkType,
                helper.maxFee,
            );

            const aggregateTransaction = AggregateTransaction.createComplete(Deadline.create(),
                [modifyMultisigAccountTransaction.toAggregate(multisigAccount.publicAccount)],
                networkType,
                [],
                helper.maxFee);
            const signedTransaction = aggregateTransaction
            .signTransactionWithCosignatories(multisigAccount, [cosignAccount1, cosignAccount2, cosignAccount3], generationHash);

            return helper.announce(signedTransaction);
        });
    });

    /**
     * =========================
     * Tests
     * =========================
     */

    describe('getAccountInfo', () => {
        it('should return account data given a NEM Address', (done) => {
            accountRepository.getAccountInfo(accountAddress)
            .subscribe((accountInfo) => {
                expect(accountInfo.publicKey).to.be.equal(accountPublicKey);
                done();
            });
        });
    });

    describe('getAccountsInfo', () => {
        it('should return account data given a NEM Address', (done) => {
            accountRepository.getAccountsInfo([accountAddress])
            .subscribe((accountsInfo) => {
                expect(accountsInfo[0].publicKey).to.be.equal(accountPublicKey);
                done();
            });
        });
    });

    describe('getMultisigAccountGraphInfo', () => {
        it('should call getMultisigAccountGraphInfo successfully', (done) => {
            multisigRepository.getMultisigAccountGraphInfo(multisigAccount.publicAccount.address).subscribe((multisigAccountGraphInfo) => {
                expect(multisigAccountGraphInfo.multisigAccounts.get(0)![0].account.publicKey).to.be.equal(multisigAccount.publicKey);
                done();
            });
        });
    });
    describe('getMultisigAccountInfo', () => {
        it('should call getMultisigAccountInfo successfully', (done) => {
            multisigRepository.getMultisigAccountInfo(multisigAccount.publicAccount.address).subscribe((multisigAccountInfo) => {
                expect(multisigAccountInfo.account.publicKey).to.be.equal(multisigAccount.publicKey);
                done();
            });
        });
    });

    describe('outgoingTransactions', () => {
        it('should call outgoingTransactions successfully', (done) => {
            accountRepository.getAccountOutgoingTransactions(publicAccount.address).subscribe((transactions) => {
                expect(transactions.length).to.be.greaterThan(0);
                done();
            });
        });
    });

    describe('aggregateBondedTransactions', () => {
        it('should call aggregateBondedTransactions successfully', (done) => {
            accountRepository.getAccountPartialTransactions(publicAccount.address).subscribe(() => {
                done();
            }, (error) => {
                console.log('Error:', error);
                assert(false);
            });
        });
    });

    describe('transactions', () => {
        it('should not return accounts when account does not exist', () => {
            return accountRepository.getAccountInfo(Account.generateNewAccount(networkType).address).toPromise().then(r => {
                return Promise.reject('should fail!');
            }, err => {
                const error = JSON.parse(err.message);
                expect(error.statusCode).to.be.eq(404);
                expect(error.errorDetails.statusMessage).to.be.eq('Not Found');
                return Promise.resolve();
            });
        });
    });

    describe('transactions', () => {
        it('should call transactions successfully by type', async () => {
            const transactions = await accountRepository.getAccountTransactions(publicAccount.address, {transactionType: TransactionType.TRANSFER} as QueryParams).toPromise();

            expect(transactions.length).to.be.greaterThan(0);
            transactions.forEach(t => {
                expect(t.type).to.be.eq(TransactionType.TRANSFER);
            });
        });
    });

    describe('transactions', () => {
        it('should call transactions successfully', (done) => {
            accountRepository.getAccountTransactions(publicAccount.address).subscribe((transactions) => {
                expect(transactions.length).to.be.greaterThan(0);
                done();
            });
        });
    });

    describe('unconfirmedTransactions', () => {
        it('should call unconfirmedTransactions successfully', (done) => {
            accountRepository.getAccountUnconfirmedTransactions(publicAccount.address).subscribe((transactions) => {
                expect(transactions.length).to.be.equal(0);
                done();
            });
        });
    });

    describe('getAddressNames', () => {
        it('should call getAddressNames successfully', (done) => {
            namespaceRepository.getAccountsNames([accountAddress]).subscribe((addressNames) => {
                expect(addressNames.length).to.be.greaterThan(0);
                done();
            });
        });
    });

    /**
     * =========================
     * House Keeping
     * =========================
     */
    describe('Remove test AddressAlias', () => {
        it('Announce addressAliasTransaction', () => {
            const addressAliasTransaction = AddressAliasTransaction.create(
                Deadline.create(),
                AliasAction.Unlink,
                namespaceId,
                account.address,
                networkType,
                helper.maxFee,
            );
            const signedTransaction = addressAliasTransaction.signWith(account, generationHash);
            return helper.announce(signedTransaction);
        });
    });

    describe('Restore test multisig Accounts', () => {
        it('Announce MultisigAccountModificationTransaction', () => {
            const removeCosigner1 = MultisigAccountModificationTransaction.create(
                Deadline.create(),
                -1,
                0,
                [],
                [cosignAccount1.publicAccount,
                ],
                networkType,
                helper.maxFee,
            );
            const removeCosigner2 = MultisigAccountModificationTransaction.create(
                Deadline.create(),
                0,
                0,
                [],
                [
                    cosignAccount2.publicAccount,
                ],
                networkType,
                helper.maxFee,
            );

            const removeCosigner3 = MultisigAccountModificationTransaction.create(
                Deadline.create(),
                -1,
                -1,
                [],
                [
                    cosignAccount3.publicAccount,
                ],
                networkType,
                helper.maxFee,
            );

            const aggregateTransaction = AggregateTransaction.createComplete(Deadline.create(),
                [removeCosigner1.toAggregate(multisigAccount.publicAccount),
                    removeCosigner2.toAggregate(multisigAccount.publicAccount),
                    removeCosigner3.toAggregate(multisigAccount.publicAccount)],
                networkType,
                [], helper.maxFee);
            const signedTransaction = aggregateTransaction
            .signTransactionWithCosignatories(cosignAccount1, [cosignAccount2, cosignAccount3], generationHash);
            return helper.announce(signedTransaction);
        });
    });
});
