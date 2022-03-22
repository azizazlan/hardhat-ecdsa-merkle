import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ERC721LazyMintWith712SignatureChecker } from '../typechain';
import { SmartWallet } from '../typechain/SmartWallet';
import tokens from './tokens.json';

let accounts: SignerWithAddress[];
let registry: ERC721LazyMintWith712SignatureChecker;
let smartWallet: SmartWallet;

interface Network {
    chainId: number;
    name: string;
}
let network: Network;

interface Token {
    tokenId: string;
    account: string; // token owner address
    signature: string;
}

async function deploy() {
    const Contract = await ethers.getContractFactory(
        'ERC721LazyMintWith712SignatureChecker',
    );
    return await Contract.deploy('Name', 'Symbol');
}

async function deploySmartWallet(owner: string) {
    const ContractFactory = await ethers.getContractFactory('SmartWallet');
    return await ContractFactory.deploy(owner);
}

describe('ERC721LazyMintWith712SignatureChecker', function () {
    before(async function () {
        accounts = await ethers.getSigners();
        smartWallet = await deploySmartWallet(accounts[0].address);
        network = await ethers.provider.getNetwork();
        expect(await smartWallet.owner()).to.be.equal(accounts[0].address);
    });

    describe('Mint all elements', () => {
        before(async () => {
            // grant minter role to smart wallet
            // Note in previous tests we grant role to account
            registry = await deploy();
            await registry.grantRole(
                await registry.MINTER_ROLE(),
                smartWallet.address,
            );
        });

        for (const [tokenId, account] of Object.entries(tokens)) {
            it('element with smart wallet signature', async () => {
                // wallet owner sign it!
                const signature = await accounts[0]._signTypedData(
                    // Domain
                    {
                        name: 'Name',
                        version: '1.0.0',
                        chainId: network.chainId,
                        verifyingContract: registry.address,
                    },
                    // Types
                    {
                        NFT: [
                            { name: 'tokenId', type: 'uint256' },
                            { name: 'account', type: 'address' },
                        ],
                    },
                    // Value
                    {
                        tokenId,
                        account,
                    },
                );
                // this time must provide smart wallet address
                await expect(
                    registry.redeem(
                        account,
                        tokenId,
                        smartWallet.address,
                        signature,
                    ),
                ).to.be.emit(registry, 'Transfer');
            });
        }
    });

    describe('Frontrunner', () => {
        let token = {} as Token;
        before(async () => {
            // grant minter role to smart wallet
            // Note in previous tests we grant role to account
            registry = await deploy();
            await registry.grantRole(
                await registry.MINTER_ROLE(),
                smartWallet.address,
            );
        });

        it('redeem success with good actor signature', async () => {
            const t = Object.entries(tokens).find(Boolean);
            token.tokenId = t ? t[0] : '';
            token.account = t ? t[1] : '';
            // good actor signature is the smart wallet owner
            const signature = await accounts[0]._signTypedData(
                // Domain
                {
                    name: 'Name',
                    version: '1.0.0',
                    chainId: network.chainId,
                    verifyingContract: registry.address,
                },
                // Types
                {
                    NFT: [
                        { name: 'tokenId', type: 'uint256' },
                        { name: 'account', type: 'address' },
                    ],
                },
                // Value
                token,
            );
            token.signature = signature;
            await expect(
                registry.redeem(
                    token.account,
                    token.tokenId,
                    smartWallet.address,
                    token.signature,
                ),
            )
                .to.be.emit(registry, 'Transfer')
                .withArgs(
                    ethers.constants.AddressZero,
                    token.account,
                    token.tokenId,
                );
        });

        it('redeem failed with bad actor signature', async () => {
            const t = Object.entries(tokens).find(Boolean);
            token.tokenId = t ? t[0] : '';
            token.account = t ? t[1] : '';
            const badActorSignature = await accounts[1]._signTypedData(
                // Domain
                {
                    name: 'Name',
                    version: '1.0.0',
                    chainId: network.chainId,
                    verifyingContract: registry.address,
                },
                // Types
                {
                    NFT: [
                        { name: 'tokenId', type: 'uint256' },
                        { name: 'account', type: 'address' },
                    ],
                },
                // Value
                token,
            );
            token.signature = badActorSignature;
            await expect(
                registry.redeem(
                    token.account,
                    token.tokenId,
                    smartWallet.address,
                    token.signature,
                ),
            ).to.be.revertedWith('Invalid signature');
        });
    });
});
