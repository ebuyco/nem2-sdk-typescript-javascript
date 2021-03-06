/*
 * Copyright 2019 NEM
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
import { expect } from 'chai';
import { Convert } from '../../src/core/format';
import { NamespaceRepository } from '../../src/infrastructure/NamespaceRepository';
import { TransactionHttp } from '../../src/infrastructure/TransactionHttp';
import { Account } from '../../src/model/account/Account';
import { Address } from '../../src/model/account/Address';
import { NetworkType } from '../../src/model/blockchain/NetworkType';
import { PlainMessage } from '../../src/model/message/PlainMessage';
import { MosaicFlags } from '../../src/model/mosaic/MosaicFlags';
import { MosaicId } from '../../src/model/mosaic/MosaicId';
import { MosaicNonce } from '../../src/model/mosaic/MosaicNonce';
import { NetworkCurrencyMosaic } from '../../src/model/mosaic/NetworkCurrencyMosaic';
import { AliasAction } from '../../src/model/namespace/AliasAction';
import { NamespaceId } from '../../src/model/namespace/NamespaceId';
import { MosaicRestrictionType } from '../../src/model/restriction/MosaicRestrictionType';
import { AddressAliasTransaction } from '../../src/model/transaction/AddressAliasTransaction';
import { AggregateTransaction } from '../../src/model/transaction/AggregateTransaction';
import { Deadline } from '../../src/model/transaction/Deadline';
import { MosaicAddressRestrictionTransaction } from '../../src/model/transaction/MosaicAddressRestrictionTransaction';
import { MosaicAliasTransaction } from '../../src/model/transaction/MosaicAliasTransaction';
import { MosaicDefinitionTransaction } from '../../src/model/transaction/MosaicDefinitionTransaction';
import { MosaicGlobalRestrictionTransaction } from '../../src/model/transaction/MosaicGlobalRestrictionTransaction';
import { MosaicMetadataTransaction } from '../../src/model/transaction/MosaicMetadataTransaction';
import { NamespaceRegistrationTransaction } from '../../src/model/transaction/NamespaceRegistrationTransaction';
import { Transaction } from '../../src/model/transaction/Transaction';
import { TransferTransaction } from '../../src/model/transaction/TransferTransaction';
import { UInt64 } from '../../src/model/UInt64';
import { IntegrationTestHelper } from './IntegrationTestHelper';

describe('TransactionHttp', () => {
    const helper = new IntegrationTestHelper();
    let account: Account;
    let account2: Account;
    let namespaceRepository: NamespaceRepository;
    let generationHash: string;
    let networkType: NetworkType;
    let mosaicId: MosaicId;
    let networkCurrencyMosaicId: MosaicId;
    let namespaceIdAddress: NamespaceId;
    let namespaceIdMosaic: NamespaceId;

    before(() => {
        return helper.start().then(() => {
            account = helper.account;
            account2 = helper.account2;
            generationHash = helper.generationHash;
            networkType = helper.networkType;
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
    describe('Get network currency mosaic id', () => {
        it('get mosaicId', (done) => {
            namespaceRepository.getLinkedMosaicId(new NamespaceId('cat.currency')).subscribe((networkMosaicId: MosaicId) => {
                networkCurrencyMosaicId = networkMosaicId;
                done();
            });
        });
    });

    describe('MosaicDefinitionTransaction', () => {

        it('standalone', () => {
            const nonce = MosaicNonce.createRandom();
            mosaicId = MosaicId.createFromNonce(nonce, account.publicAccount);
            const mosaicDefinitionTransaction = MosaicDefinitionTransaction.create(
                Deadline.create(),
                nonce,
                mosaicId,
                MosaicFlags.create(true, true, true),
                3,
                UInt64.fromUint(1000),
                networkType, helper.maxFee,
            );
            const signedTransaction = mosaicDefinitionTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction);
        });
    });

    describe('NamespaceRegistrationTransaction', () => {

        it('standalone', () => {
            const namespaceName = 'root-test-namespace-' + Math.floor(Math.random() * 10000);
            const registerNamespaceTransaction = NamespaceRegistrationTransaction.createRootNamespace(
                Deadline.create(),
                namespaceName,
                UInt64.fromUint(50),
                networkType, helper.maxFee,
            );
            namespaceIdMosaic = new NamespaceId(namespaceName);
            const signedTransaction = registerNamespaceTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction);
        });
    });

    describe('NamespaceRegistrationTransaction', () => {

        it('standalone', () => {
            const namespaceName = 'root-test-namespace-' + Math.floor(Math.random() * 10000);
            const registerNamespaceTransaction = NamespaceRegistrationTransaction.createRootNamespace(
                Deadline.create(),
                namespaceName,
                UInt64.fromUint(50),
                networkType, helper.maxFee,
            );
            namespaceIdAddress = new NamespaceId(namespaceName);
            const signedTransaction = registerNamespaceTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction);
        });
    });

    describe('AddressAliasTransaction', () => {

        it('standalone', () => {
            const addressAliasTransaction = AddressAliasTransaction.create(
                Deadline.create(),
                AliasAction.Link,
                namespaceIdAddress,
                account.address,
                networkType, helper.maxFee,
            );
            const signedTransaction = addressAliasTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction);
        });
    });

    describe('MosaicAliasTransaction', () => {

        it('standalone', () => {
            const mosaicAliasTransaction = MosaicAliasTransaction.create(
                Deadline.create(),
                AliasAction.Link,
                namespaceIdMosaic,
                mosaicId,
                networkType, helper.maxFee,
            );
            const signedTransaction = mosaicAliasTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction);
        });
    });

    /**
     * =========================
     * Test unresolved inputs
     * =========================
     */

    describe('MosaicMetadataTransaction', () => {

        it('aggregate', () => {
            const mosaicMetadataTransaction = MosaicMetadataTransaction.create(
                Deadline.create(),
                account.publicKey,
                UInt64.fromUint(5),
                namespaceIdMosaic,
                10,
                Convert.uint8ToUtf8(new Uint8Array(10)),
                networkType, helper.maxFee,
            );

            const aggregateTransaction = AggregateTransaction.createComplete(Deadline.create(),
                [mosaicMetadataTransaction.toAggregate(account.publicAccount)],
                networkType, [], helper.maxFee,
            );
            const signedTransaction = aggregateTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction).then((transaction: AggregateTransaction) => {
                transaction.innerTransactions.forEach((innerTx) => {
                    expect((innerTx as MosaicMetadataTransaction).targetMosaicId instanceof NamespaceId).to.be.true;
                });

            });
        });
    });

    describe('MosaicGlobalRestrictionTransaction', () => {

        it('standalone', () => {
            const mosaicGlobalRestrictionTransaction = MosaicGlobalRestrictionTransaction.create(
                Deadline.create(),
                namespaceIdMosaic,
                UInt64.fromUint(60641),
                UInt64.fromUint(0),
                MosaicRestrictionType.NONE,
                UInt64.fromUint(0),
                MosaicRestrictionType.GE,
                networkType, undefined, helper.maxFee,
            );
            const signedTransaction = mosaicGlobalRestrictionTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction).then((transaction: Transaction) => {
                expect((transaction as MosaicGlobalRestrictionTransaction).mosaicId instanceof NamespaceId).to.be.true;

            });
        });
    });

    describe('MosaicAddressRestrictionTransaction', () => {

        it('aggregate', () => {
            const mosaicAddressRestrictionTransaction = MosaicAddressRestrictionTransaction.create(
                Deadline.create(),
                namespaceIdMosaic,
                UInt64.fromUint(60641),
                namespaceIdAddress,
                UInt64.fromUint(2),
                networkType, helper.maxFee,
            );
            const aggregateTransaction = AggregateTransaction.createComplete(Deadline.create(),
                [mosaicAddressRestrictionTransaction.toAggregate(account.publicAccount)],
                networkType,
                [], helper.maxFee,
            );
            const signedTransaction = aggregateTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction).then((transaction: AggregateTransaction) => {
                transaction.innerTransactions.forEach((innerTx) => {
                    expect((innerTx as MosaicAddressRestrictionTransaction).mosaicId instanceof NamespaceId).to.be.true;
                    expect((innerTx as MosaicAddressRestrictionTransaction).targetAddress instanceof NamespaceId).to.be.true;
                });
            });
        });
    });

    describe('TransferTransaction', () => {

        it('standalone', () => {
            const transferTransaction = TransferTransaction.create(
                Deadline.create(),
                account2.address,
                [NetworkCurrencyMosaic.createAbsolute(1)],
                PlainMessage.create('test-message'),
                networkType, helper.maxFee,
            );
            const signedTransaction = transferTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction).then((transaction: TransferTransaction) => {
                expect(transaction.mosaics[0].id instanceof NamespaceId).to.be.true;
            });
        });
    });

    /**
     * =========================
     * House Keeping
     * =========================
     */

    describe('AddressAliasTransaction', () => {

        it('standalone', () => {
            const addressAliasTransaction = AddressAliasTransaction.create(
                Deadline.create(),
                AliasAction.Unlink,
                namespaceIdAddress,
                account.address,
                networkType, helper.maxFee,
            );
            const signedTransaction = addressAliasTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction).then((transaction: AddressAliasTransaction) => {
                expect(transaction.namespaceId, 'NamespaceId').not.to.be.undefined;
                expect(transaction.aliasAction, 'AliasAction').not.to.be.undefined;
                expect(transaction.address, 'Address').not.to.be.undefined;

            });
        });
    });

    describe('MosaicAliasTransaction', () => {

        it('standalone', () => {
            const mosaicAliasTransaction = MosaicAliasTransaction.create(
                Deadline.create(),
                AliasAction.Unlink,
                namespaceIdMosaic,
                mosaicId,
                networkType, helper.maxFee,
            );
            const signedTransaction = mosaicAliasTransaction.signWith(account, generationHash);

            return helper.announce(signedTransaction).then((transaction: MosaicAliasTransaction) => {
                expect(transaction.namespaceId, 'NamespaceId').not.to.be.undefined;
                expect(transaction.aliasAction, 'AliasAction').not.to.be.undefined;
                expect(transaction.mosaicId, 'MosaicId').not.to.be.undefined;
            });
        });
    });
});
