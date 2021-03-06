/*
 * Copyright 2019 NEM
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from 'chai';
import { UnresolvedMapping } from '../../../src/core/utils/UnresolvedMapping';
import { CreateStatementFromDTO } from '../../../src/infrastructure/receipt/CreateReceiptFromDTO';
import { Account } from '../../../src/model/account/Account';
import { NetworkType } from '../../../src/model/blockchain/NetworkType';
import { Address, MosaicId, NamespaceId, ResolutionType } from '../../../src/model/model';

describe('ResolutionStatement', () => {
    let account: Account;
    let transactionStatementsDTO;
    let addressResolutionStatementsDTO;
    let mosaicResolutionStatementsDTO;
    let statementDTO;

    before(() => {
        account = Account.createFromPrivateKey('81C18245507F9C15B61BDEDAFA2C10D9DC2C4E401E573A10935D45AA2A461FD5', NetworkType.MIJIN_TEST);
        transactionStatementsDTO = [
            {
                statement: {
                    height: '1473',
                    source: {
                    primaryId: 0,
                    secondaryId: 0,
                    },
                    receipts: [
                        {
                            version: 1,
                            type: 8515,
                            targetPublicKey: 'B2708D49C46F8AB5CDBD7A09C959EEA12E4A782592F3D1D3D17D54622E655D7F',
                            mosaicId: '504677C3281108DB',
                            amount: '0',
                        },
                    ],
                },
            },
        ];
        addressResolutionStatementsDTO = [
            {
                statement: {
                    height: '1473',
                    unresolved: '9156258DE356F030A500000000000000000000000000000000',
                    resolutionEntries: [
                    {
                        source: {
                        primaryId: 1,
                        secondaryId: 0,
                        },
                        resolved: '901D8D4741F80299E66BF7FEEB4F30943DA7B68E068B182319',
                    },
                    ],
                },
            },
        ];
        mosaicResolutionStatementsDTO = [
            {
                statement: {
                    height: '1473',
                    unresolved: '85BBEA6CC462B244',
                    resolutionEntries: [
                    {
                        source: {
                        primaryId: 1,
                        secondaryId: 0,
                        },
                        resolved: '504677C3281108DB',
                    },
                    {
                        source: {
                        primaryId: 3,
                        secondaryId: 5,
                        },
                        resolved: '401F622A3111A3E4',
                    },
                    ],
                },
            },
            {
                statement: {
                    height: '1473',
                    unresolved: 'E81F622A5B11A340',
                    resolutionEntries: [
                    {
                        source: {
                        primaryId: 3,
                        secondaryId: 1,
                        },
                        resolved: '756482FB80FD406C',
                    },
                    ],
                },
            },
            {
                statement: {
                    height: '1500',
                    unresolved: '85BBEA6CC462B244',
                    resolutionEntries: [
                    {
                        source: {
                        primaryId: 1,
                        secondaryId: 1,
                        },
                        resolved: '0DC67FBE1CAD29E5',
                    },
                    {
                        source: {
                        primaryId: 1,
                        secondaryId: 4,
                        },
                        resolved: '7CDF3B117A3C40CC',
                    },
                    {
                        source: {
                        primaryId: 1,
                        secondaryId: 7,
                        },
                        resolved: '0DC67FBE1CAD29E5',
                    },
                    {
                        source: {
                        primaryId: 2,
                        secondaryId: 4,
                        },
                        resolved: '7CDF3B117A3C40CC',
                    },
                    ],
                },
            },
        ];

        statementDTO = {
            transactionStatements: transactionStatementsDTO,
            addressResolutionStatements: addressResolutionStatementsDTO,
            mosaicResolutionStatements: mosaicResolutionStatementsDTO,
        };
    });

    it('should get resolve entry when both primaryId and secondaryId matched', () => {
        const statement = CreateStatementFromDTO(statementDTO, NetworkType.MIJIN_TEST);
        const entry = statement.addressResolutionStatements[0].getResolutionEntryById(1, 0);

        expect(entry!.resolved instanceof Address).to.be.true;
        expect((entry!.resolved as Address).equals(account.address)).to.be.true;
    });

    it('should get resolved entry when primaryId is greater than max', () => {
        const statement = CreateStatementFromDTO(statementDTO, NetworkType.MIJIN_TEST);
        const entry = statement.mosaicResolutionStatements[0].getResolutionEntryById(4, 0);
        expect(entry!.source.primaryId).to.be.equal(3);
        expect(entry!.source.secondaryId).to.be.equal(5);
        expect(entry!.resolved instanceof MosaicId).to.be.true;
        expect((entry!.resolved as MosaicId).equals(new MosaicId('401F622A3111A3E4'))).to.be.true;
    });

    it('should get resolved entry when primaryId is in middle of 2 pirmaryIds', () => {
        const statement = CreateStatementFromDTO(statementDTO, NetworkType.MIJIN_TEST);
        const entry = statement.mosaicResolutionStatements[0].getResolutionEntryById(2, 1);
        expect(entry!.source.primaryId).to.be.equal(1);
        expect(entry!.source.secondaryId).to.be.equal(0);
        expect(entry!.resolved instanceof MosaicId).to.be.true;
        expect((entry!.resolved as MosaicId).equals(new MosaicId('504677C3281108DB'))).to.be.true;
    });

    it('should get resolved entry when primaryId matches but not secondaryId', () => {
        const statement = CreateStatementFromDTO(statementDTO, NetworkType.MIJIN_TEST);
        const entry = statement.mosaicResolutionStatements[0].getResolutionEntryById(3, 6);
        expect(entry!.source.primaryId).to.be.equal(3);
        expect(entry!.source.secondaryId).to.be.equal(5);
        expect(entry!.resolved instanceof MosaicId).to.be.true;
        expect((entry!.resolved as MosaicId).equals(new MosaicId('401F622A3111A3E4'))).to.be.true;
    });

    it('should get resolved entry when primaryId matches but secondaryId less than minimum', () => {
        const statement = CreateStatementFromDTO(statementDTO, NetworkType.MIJIN_TEST);
        const entry = statement.mosaicResolutionStatements[0].getResolutionEntryById(3, 1);
        expect(entry!.source.primaryId).to.be.equal(1);
        expect(entry!.source.secondaryId).to.be.equal(0);
        expect(entry!.resolved instanceof MosaicId).to.be.true;
        expect((entry!.resolved as MosaicId).equals(new MosaicId('504677C3281108DB'))).to.be.true;
    });

    it('should return undefined', () => {
        const statement = CreateStatementFromDTO(statementDTO, NetworkType.MIJIN_TEST);
        const entry = statement.addressResolutionStatements[0].getResolutionEntryById(0, 0);
        expect(entry).to.be.undefined;
    });

    it('resolution change in the block (more than one AGGREGATE)', () => {
        const statement = CreateStatementFromDTO(statementDTO, NetworkType.MIJIN_TEST);
        const resolution = statement.mosaicResolutionStatements[2];
        expect((resolution.getResolutionEntryById(1, 1)!.resolved as MosaicId).toHex()).to.be.equal('0DC67FBE1CAD29E5');
        expect((resolution.getResolutionEntryById(1, 4)!.resolved as MosaicId).toHex()).to.be.equal('7CDF3B117A3C40CC');
        expect((resolution.getResolutionEntryById(1, 7)!.resolved as MosaicId).toHex()).to.be.equal('0DC67FBE1CAD29E5');
        expect((resolution.getResolutionEntryById(2, 1)!.resolved as MosaicId).toHex()).to.be.equal('0DC67FBE1CAD29E5');
        expect((resolution.getResolutionEntryById(2, 4)!.resolved as MosaicId).toHex()).to.be.equal('7CDF3B117A3C40CC');

        expect((resolution.getResolutionEntryById(3, 0)!.resolved as MosaicId).toHex()).to.be.equal('7CDF3B117A3C40CC');
        expect((resolution.getResolutionEntryById(2, 2)!.resolved as MosaicId).toHex()).to.be.equal('0DC67FBE1CAD29E5');
        expect(resolution.getResolutionEntryById(1, 0)).to.be.undefined;
        expect((resolution.getResolutionEntryById(1, 6)!.resolved as MosaicId).toHex()).to.be.equal('7CDF3B117A3C40CC');
        expect((resolution.getResolutionEntryById(1, 2)!.resolved as MosaicId).toHex()).to.be.equal('0DC67FBE1CAD29E5');
    });

});
