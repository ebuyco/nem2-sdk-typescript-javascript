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
import { ChronoUnit } from 'js-joda';
import { NamespaceRepository } from '../../src/infrastructure/NamespaceRepository';
import { Account } from '../../src/model/account/Account';
import { Address } from '../../src/model/account/Address';
import { NetworkType } from '../../src/model/blockchain/NetworkType';
import { PlainMessage } from '../../src/model/message/PlainMessage';
import { Mosaic } from '../../src/model/mosaic/Mosaic';
import { MosaicId } from '../../src/model/mosaic/MosaicId';
import { NetworkCurrencyMosaic } from '../../src/model/mosaic/NetworkCurrencyMosaic';
import { NamespaceId } from '../../src/model/namespace/NamespaceId';
import { AggregateTransaction } from '../../src/model/transaction/AggregateTransaction';
import { Deadline } from '../../src/model/transaction/Deadline';
import { LockFundsTransaction } from '../../src/model/transaction/LockFundsTransaction';
import { MultisigAccountModificationTransaction } from '../../src/model/transaction/MultisigAccountModificationTransaction';
import { SignedTransaction } from '../../src/model/transaction/SignedTransaction';
import { TransactionType } from '../../src/model/transaction/TransactionType';
import { TransferTransaction } from '../../src/model/transaction/TransferTransaction';
import { UInt64 } from '../../src/model/UInt64';
import { TransactionService } from '../../src/service/TransactionService';
import { IntegrationTestHelper } from '../infrastructure/IntegrationTestHelper';

describe('TransactionService', () => {

    const helper = new IntegrationTestHelper();
    let account: Account;
    let account2: Account;
    let multisigAccount: Account;
    let cosignAccount1: Account;
    let cosignAccount2: Account;
    let cosignAccount3: Account;
    let namespaceRepository: NamespaceRepository;
    let generationHash: string;
    let networkType: NetworkType;
    let transactionService: TransactionService;
    let networkCurrencyMosaicId: MosaicId;

    before(() => {
        return helper.start().then(() => {
            account = helper.account;
            account2 = helper.account2;
            multisigAccount = helper.multisigAccount;
            cosignAccount1 = helper.cosignAccount1;
            cosignAccount2 = helper.cosignAccount2;
            cosignAccount3 = helper.cosignAccount3;
            generationHash = helper.generationHash;
            networkType = helper.networkType;
            namespaceRepository = helper.repositoryFactory.createNamespaceRepository();
            transactionService = new TransactionService(helper.repositoryFactory.createTransactionRepository(),
                helper.repositoryFactory.createReceiptRepository());
        });
    });
    before(() => {
        return helper.listener.open();
    });

    after(() => {
        helper.listener.close();
    });

    const createSignedAggregatedBondTransaction = (aggregatedTo: Account,
                                                   signer: Account,
                                                   recipient: Address): SignedTransaction => {
        const transferTransaction = TransferTransaction.create(
            Deadline.create(),
            recipient, [],
            PlainMessage.create('test-message'),
            networkType, helper.maxFee,
        );

        const aggregateTransaction = AggregateTransaction.createBonded(
            Deadline.create(2, ChronoUnit.MINUTES),
            [transferTransaction.toAggregate(aggregatedTo.publicAccount)],
            networkType, [], helper.maxFee,
        );
        return signer.sign(aggregateTransaction, generationHash);
    };

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
                networkType, helper.maxFee,
            );

            const aggregateTransaction = AggregateTransaction.createComplete(Deadline.create(),
                [modifyMultisigAccountTransaction.toAggregate(multisigAccount.publicAccount)],
                networkType, [], helper.maxFee);
            const signedTransaction = aggregateTransaction
            .signTransactionWithCosignatories(multisigAccount, [cosignAccount1, cosignAccount2, cosignAccount3], generationHash);

            return helper.announce(signedTransaction);
        });
    });

    /**
     * =========================
     * Test
     * =========================
     */

    describe('should announce transaction', () => {

        it('announce', (done) => {
            const transferTransaction = TransferTransaction.create(
                Deadline.create(),
                account2.address,
                [
                    NetworkCurrencyMosaic.createAbsolute(1),
                ],
                PlainMessage.create('test-message'),
                networkType, helper.maxFee,
            );
            const signedTransaction = transferTransaction.signWith(account, generationHash);
            transactionService.announce(signedTransaction, helper.listener).subscribe((tx: TransferTransaction) => {
                expect(tx.signer!.publicKey).to.be.equal(account.publicKey);
                expect((tx.recipientAddress as Address).equals(account2.address)).to.be.true;
                expect(tx.message.payload).to.be.equal('test-message');
                done();
            });
        });
    });

    describe('should announce aggregate bonded with hashlock', () => {

        it('announce', (done) => {
            const signedAggregatedTransaction = createSignedAggregatedBondTransaction(multisigAccount, account, account2.address);
            const lockFundsTransaction = LockFundsTransaction.create(
                Deadline.create(),
                new Mosaic(networkCurrencyMosaicId, UInt64.fromUint(10 * Math.pow(10, NetworkCurrencyMosaic.DIVISIBILITY))),
                UInt64.fromUint(1000),
                signedAggregatedTransaction,
                networkType, helper.maxFee,
            );
            const signedLockFundsTransaction = lockFundsTransaction.signWith(account, generationHash);
            transactionService
            .announceHashLockAggregateBonded(signedLockFundsTransaction, signedAggregatedTransaction, helper.listener).subscribe((tx) => {
                expect(tx.signer!.publicKey).to.be.equal(account.publicKey);
                expect(tx.type).to.be.equal(TransactionType.AGGREGATE_BONDED);
                done();
            });
        });
    });

    describe('should announce aggregate bonded transaction', () => {

        it('announce', (done) => {
            const signedAggregatedTransaction = createSignedAggregatedBondTransaction(multisigAccount, account, account2.address);
            const lockFundsTransaction = LockFundsTransaction.create(
                Deadline.create(),
                new Mosaic(networkCurrencyMosaicId, UInt64.fromUint(10 * Math.pow(10, NetworkCurrencyMosaic.DIVISIBILITY))),
                UInt64.fromUint(1000),
                signedAggregatedTransaction,
                networkType, helper.maxFee,
            );
            const signedLockFundsTransaction = lockFundsTransaction.signWith(account, generationHash);
            transactionService.announce(signedLockFundsTransaction, helper.listener).subscribe(() => {
                transactionService.announceAggregateBonded(signedAggregatedTransaction, helper.listener).subscribe((tx) => {
                    expect(tx.signer!.publicKey).to.be.equal(account.publicKey);
                    expect(tx.type).to.be.equal(TransactionType.AGGREGATE_BONDED);
                    done();
                });
            });
        });
    });

    /**
     * =========================
     * House Keeping
     * =========================
     */

    describe('Restore test multisig Accounts', () => {

        it('Announce MultisigAccountModificationTransaction', () => {
            const removeCosigner1 = MultisigAccountModificationTransaction.create(
                Deadline.create(),
                -1,
                0,
                [],
                [cosignAccount1.publicAccount,
                ],
                networkType, helper.maxFee,
            );
            const removeCosigner2 = MultisigAccountModificationTransaction.create(
                Deadline.create(),
                0,
                0,
                [],
                [
                    cosignAccount2.publicAccount,
                ],
                networkType, helper.maxFee,
            );

            const removeCosigner3 = MultisigAccountModificationTransaction.create(
                Deadline.create(),
                -1,
                -1,
                [],
                [
                    cosignAccount3.publicAccount,
                ],
                networkType, helper.maxFee,
            );

            const aggregateTransaction = AggregateTransaction.createComplete(Deadline.create(),
                [removeCosigner1.toAggregate(multisigAccount.publicAccount),
                    removeCosigner2.toAggregate(multisigAccount.publicAccount),
                    removeCosigner3.toAggregate(multisigAccount.publicAccount)], networkType, [], helper.maxFee);
            const signedTransaction = aggregateTransaction
            .signTransactionWithCosignatories(cosignAccount1, [cosignAccount2, cosignAccount3], generationHash);

            return helper.announce(signedTransaction);
        });
    });
});
